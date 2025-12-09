// === BRICK'S VIDEO PERCEPTION ===
// Extract key frames from videos for analysis

const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const os = require('os');

class BrickVideo {
  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'brick-video');
    this.ensureTempDir();
  }

  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  // Download video to temp file
  async downloadVideo(url) {
    return new Promise((resolve, reject) => {
      const filename = `video_${Date.now()}.mp4`;
      const filepath = path.join(this.tempDir, filename);
      const file = fs.createWriteStream(filepath);

      const protocol = url.startsWith('https') ? https : http;

      const request = protocol.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BrickBot/1.0)'
        }
      }, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          file.close();
          fs.unlinkSync(filepath);
          return this.downloadVideo(response.headers.location).then(resolve).catch(reject);
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(filepath);
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve(filepath);
        });
      });

      request.on('error', (err) => {
        file.close();
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        reject(err);
      });

      request.setTimeout(60000, () => {
        request.destroy();
        reject(new Error('Download timeout'));
      });
    });
  }

  // Get video duration
  async getVideoDuration(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(metadata.format.duration || 0);
      });
    });
  }

  // Extract frames at specific timestamps
  async extractFrames(videoPath, timestamps) {
    const frames = [];

    for (const timestamp of timestamps) {
      try {
        const framePath = await this.extractSingleFrame(videoPath, timestamp);
        if (framePath) {
          // Read frame as base64
          const data = fs.readFileSync(framePath);
          frames.push({
            timestamp,
            data: data.toString('base64'),
            mediaType: 'image/jpeg'
          });
          // Clean up frame file
          fs.unlinkSync(framePath);
        }
      } catch (err) {
        console.warn(`Could not extract frame at ${timestamp}s:`, err.message);
      }
    }

    return frames;
  }

  // Extract a single frame at a timestamp
  async extractSingleFrame(videoPath, timestamp) {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(this.tempDir, `frame_${Date.now()}_${timestamp}.jpg`);

      ffmpeg(videoPath)
        .seekInput(timestamp)
        .outputOptions([
          '-frames:v 1',
          '-q:v 2'
        ])
        .output(outputPath)
        .on('end', () => {
          if (fs.existsSync(outputPath)) {
            resolve(outputPath);
          } else {
            resolve(null);
          }
        })
        .on('error', (err) => {
          reject(err);
        })
        .run();
    });
  }

  // Main method: extract key frames from a video URL
  async extractKeyFrames(videoUrl, options = {}) {
    const {
      maxFrames = 4,        // Maximum number of frames to extract
      intervalSeconds = 10,  // Seconds between frames if video is long
      maxDuration = 120      // Don't process videos longer than this
    } = options;

    let videoPath = null;

    try {
      console.log('   📹 Downloading video for analysis...');
      videoPath = await this.downloadVideo(videoUrl);

      // Get duration
      const duration = await this.getVideoDuration(videoPath);
      console.log(`   📹 Video duration: ${duration.toFixed(1)}s`);

      if (duration > maxDuration) {
        console.log(`   ⚠️  Video too long (>${maxDuration}s), using thumbnail only`);
        return null;
      }

      // Calculate timestamps to extract
      const timestamps = [];

      if (duration <= 30) {
        // Short video: beginning, middle, end
        timestamps.push(0);
        if (duration > 5) timestamps.push(duration / 2);
        if (duration > 10) timestamps.push(Math.max(0, duration - 2));
      } else {
        // Longer video: sample at intervals
        for (let t = 0; t < duration && timestamps.length < maxFrames; t += intervalSeconds) {
          timestamps.push(t);
        }
        // Always include near the end
        if (timestamps.length < maxFrames && duration > intervalSeconds) {
          timestamps.push(Math.max(0, duration - 2));
        }
      }

      // Limit to maxFrames
      const selectedTimestamps = timestamps.slice(0, maxFrames);
      console.log(`   📹 Extracting ${selectedTimestamps.length} frames at: ${selectedTimestamps.map(t => t.toFixed(1) + 's').join(', ')}`);

      // Extract frames
      const frames = await this.extractFrames(videoPath, selectedTimestamps);

      console.log(`   ✅ Extracted ${frames.length} frames`);

      return frames;

    } catch (error) {
      console.warn('   ⚠️  Video processing failed:', error.message);
      return null;
    } finally {
      // Clean up video file
      if (videoPath && fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
    }
  }

  // Convert frames to format Claude can use
  framesToClaudeFormat(frames) {
    if (!frames || frames.length === 0) return [];

    return frames.map(frame => ({
      type: 'image',
      source: {
        type: 'base64',
        media_type: frame.mediaType,
        data: frame.data
      }
    }));
  }

  // Clean up temp directory
  cleanup() {
    try {
      const files = fs.readdirSync(this.tempDir);
      for (const file of files) {
        fs.unlinkSync(path.join(this.tempDir, file));
      }
    } catch (err) {
      // Ignore cleanup errors
    }
  }
}

module.exports = { BrickVideo };
