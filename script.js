document.addEventListener('DOMContentLoaded', function() {
    const output = document.getElementById('output');
    const terminalInput = document.getElementById('terminal-input');
    const cursor = document.getElementById('cursor');
    const inputLine = document.getElementById('input-line');
    const terminal = document.querySelector('.terminal-container');
    const terminalHeader = document.querySelector('.terminal-header');
    
    let isTyping = false;
    let waitingForResponse = false;
    let currentStep = 'initial';
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    
    // Focus on input
    terminalInput.focus();
    
    // Drag functionality (desktop only)
    terminalHeader.addEventListener('mousedown', function(e) {
        // Disable drag on mobile
        if (window.innerWidth <= 768) return;
        
        isDragging = true;
        const rect = terminal.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        terminalHeader.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', function(e) {
        if (isDragging) {
            const newX = e.clientX - dragOffset.x;
            const newY = e.clientY - dragOffset.y;
            
            // Keep terminal within viewport
            const maxX = window.innerWidth - terminal.offsetWidth;
            const maxY = window.innerHeight - terminal.offsetHeight;
            
            const constrainedX = Math.max(0, Math.min(newX, maxX));
            const constrainedY = Math.max(0, Math.min(newY, maxY));
            
            terminal.style.left = constrainedX + 'px';
            terminal.style.top = constrainedY + 'px';
        }
    });
    
    document.addEventListener('mouseup', function() {
        isDragging = false;
        terminalHeader.style.cursor = 'move';
    });
    
    // Terminal button functionality
    let isMinimized = false;
    let isFullscreen = false;
    let originalSize = {};
    
    // Store original size
    function storeOriginalSize() {
        originalSize = {
            width: terminal.offsetWidth,
            height: terminal.offsetHeight,
            left: terminal.offsetLeft,
            top: terminal.offsetTop
        };
    }
    
    // Close button
    document.querySelector('.btn.close').addEventListener('click', function() {
        terminal.style.display = 'none';
        setTimeout(() => {
            terminal.style.display = 'block';
            terminal.style.opacity = '0';
            setTimeout(() => {
                terminal.style.opacity = '1';
            }, 100);
        }, 3000);
    });
    
    // Minimize button
    document.querySelector('.btn.minimize').addEventListener('click', function() {
        if (!isMinimized) {
            storeOriginalSize();
            terminal.style.height = '50px';
            terminal.style.bottom = '20px';
            terminal.style.top = 'auto';
            document.querySelector('.terminal-body').style.display = 'none';
            isMinimized = true;
        } else {
            terminal.style.height = originalSize.height + 'px';
            terminal.style.top = originalSize.top + 'px';
            terminal.style.bottom = 'auto';
            document.querySelector('.terminal-body').style.display = 'flex';
            isMinimized = false;
        }
    });
    
    // Maximize/Fullscreen button
    document.querySelector('.btn.maximize').addEventListener('click', function() {
        if (!isFullscreen) {
            storeOriginalSize();
            terminal.style.width = '100vw';
            terminal.style.height = '100vh';
            terminal.style.left = '0';
            terminal.style.top = '0';
            document.querySelector('.terminal').style.borderRadius = '0';
            isFullscreen = true;
        } else {
            terminal.style.width = originalSize.width + 'px';
            terminal.style.height = originalSize.height + 'px';
            terminal.style.left = originalSize.left + 'px';
            terminal.style.top = originalSize.top + 'px';
            document.querySelector('.terminal').style.borderRadius = '10px';
            isFullscreen = false;
        }
    });
    
    // Handle input
    terminalInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            handleCommand(terminalInput.value.trim());
            terminalInput.value = '';
        }
    });
    
    // Show what user is typing next to cursor
    terminalInput.addEventListener('input', function(e) {
        if (currentStep === 'waiting-for-resume-response' || currentStep === 'waiting-for-any-command' || currentStep === 'cleared' || currentStep === 'complete') {
            const cursor = output.querySelector('.typing-cursor');
            if (cursor) {
                // Remove any existing typed text
                const existingTyped = output.querySelector('.user-typing');
                if (existingTyped) {
                    existingTyped.remove();
                }
                
                // Add the typed text before the cursor
                if (terminalInput.value) {
                    const typedSpan = document.createElement('span');
                    typedSpan.className = 'user-typing';
                    typedSpan.textContent = terminalInput.value;
                    cursor.parentNode.insertBefore(typedSpan, cursor);
                }
            } else {
                // If no cursor found, create one and add typing
                if (terminalInput.value) {
                    const typedSpan = document.createElement('span');
                    typedSpan.className = 'user-typing';
                    typedSpan.textContent = terminalInput.value;
                    output.appendChild(typedSpan);
                    
                    const cursor = document.createElement('span');
                    cursor.className = 'typing-cursor';
                    cursor.textContent = '█';
                    output.appendChild(cursor);
                }
            }
        }
    });
    
    // Keep focus on input
    document.addEventListener('click', function() {
        terminalInput.focus();
    });
    
    // Typewriter effect with cursor
    function typeText(text, speed = 50, leaveCursor = false) {
        return new Promise((resolve) => {
            isTyping = true;
            let i = 0;
            
            function type() {
                if (i < text.length) {
                    // Remove cursor if it exists
                    const existingCursor = output.querySelector('.typing-cursor');
                    if (existingCursor) {
                        existingCursor.remove();
                    }
                    
                    // Add character
                    output.innerHTML += text.charAt(i);
                    
                    // Add cursor after the character
                    const cursor = document.createElement('span');
                    cursor.className = 'typing-cursor';
                    cursor.textContent = '█';
                    output.appendChild(cursor);
                    
                    i++;
                    setTimeout(type, speed);
                } else {
                    // Keep or remove cursor when done
                    if (!leaveCursor) {
                        const existingCursor = output.querySelector('.typing-cursor');
                        if (existingCursor) {
                            existingCursor.remove();
                        }
                    }
                    
                    isTyping = false;
                    resolve();
                }
            }
            
            type();
        });
    }
    
    // Add line to output
    function addLine(text, className = 'output-line') {
        const line = document.createElement('div');
        line.className = className;
        line.textContent = text;
        output.appendChild(line);
        scrollToBottom();
    }
    
    // Add HTML content to output
    function addHTML(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        output.appendChild(div);
        scrollToBottom();
    }
    
    // Scroll to bottom
    function scrollToBottom() {
        const terminalBody = document.querySelector('.terminal-body');
        terminalBody.scrollTop = terminalBody.scrollHeight;
    }
    
    // Handle user commands
    function handleCommand(command) {
        const lowerCommand = command.toLowerCase();
        
        // Remove the blinking cursor and add the command
        const existingCursor = output.querySelector('.typing-cursor');
        if (existingCursor) {
            existingCursor.remove();
        }
        
        // Remove any user typing display
        const existingTyped = output.querySelector('.user-typing');
        if (existingTyped) {
            existingTyped.remove();
        }
        
        output.innerHTML += command + '\n';
        
        // Handle clear command first (available in any state)
        if (lowerCommand === 'clear') {
            clearTerminal();
            return;
        }
        
        if (currentStep === 'waiting-for-resume-response') {
            if (lowerCommand === 'y' || lowerCommand === 'yes') {
                currentStep = 'generating-resume';
                generateResume();
            } else if (lowerCommand === 'n' || lowerCommand === 'no') {
                currentStep = 'showing-secret';
                showSecretMessage();
            } else {
                output.innerHTML += 'Please enter y or n\n> ';
                // Add cursor back
                const cursor = document.createElement('span');
                cursor.className = 'typing-cursor';
                cursor.textContent = '█';
                output.appendChild(cursor);
            }
        } else if (currentStep === 'waiting-for-any-command' || currentStep === 'complete' || currentStep === 'cleared') {
            if (lowerCommand === 'hello') {
                output.innerHTML += 'Hello again! :)\n> ';
                const cursor = document.createElement('span');
                cursor.className = 'typing-cursor';
                cursor.textContent = '█';
                output.appendChild(cursor);
            } else {
                output.innerHTML += `Command not found: ${command}\n> `;
                const cursor = document.createElement('span');
                cursor.className = 'typing-cursor';
                cursor.textContent = '█';
                output.appendChild(cursor);
            }
        } else {
            output.innerHTML += `Command not found: ${command}\n`;
        }
        
        terminalInput.focus();
        scrollToBottom();
    }
    
    // Clear terminal with easter egg
    function clearTerminal() {
        output.innerHTML = '<div class="thanks-message">:) thanks!</div>';
        currentStep = 'cleared';
        
        // Add new prompt after the thanks message
        setTimeout(() => {
            output.innerHTML = '<div class="thanks-message">:) thanks!</div>\n\n> ';
            const cursor = document.createElement('span');
            cursor.className = 'typing-cursor';
            cursor.textContent = '█';
            output.appendChild(cursor);
            currentStep = 'waiting-for-any-command';
            terminalInput.value = '';
            terminalInput.focus();
            scrollToBottom();
        }, 2000);
    }
    
    // Generate resume content
    async function generateResume() {
        addLine('🚀 Generating resume... ✨', 'output-line result-line');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Type out the resume with typewriter effect
        await typeText('\n', 30);
        
        // Name and title (centered)
        await typeText('                    Jace Hite\n', 40);
        await typeText('                AI Growth Specialist\n', 40);
        await typeText('\n', 30);
        
        // Contact info (centered) - making email clickable
        await typeText('          ', 30);
        const emailLine = document.createElement('span');
        emailLine.innerHTML = '<a href="mailto:jacehite@gmail.com" class="email-link" style="color: #ffffff; text-decoration: underline;">jacehite@gmail.com</a>';
        
        // Remove any existing cursor
        const existingCursor = output.querySelector('.typing-cursor');
        if (existingCursor) {
            existingCursor.remove();
        }
        
        output.appendChild(emailLine);
        await typeText(' • (217) 413-3455\n', 30);
        await typeText('\n', 30);
        
        // About section
        await typeText('ABOUT\n', 40);
        await typeText('────────────────────────────────────────────────────────────────\n', 20);
        await typeText('Uniquely positioned at the intersection of human connection and\n', 30);
        await typeText('technology, with a non-traditional background that brings fresh\n', 30);
        await typeText('perspectives to problem-solving. Comfortable navigating ambiguity\n', 30);
        await typeText('and learning rapidly in fast-paced environments.\n', 30);
        await typeText('\n', 30);
        await typeText('Key Strengths:\n', 30);
        await typeText('▶ Adaptable learner with proven ability to navigate diverse environments\n', 30);
        await typeText('▶ Fresh perspective from non-traditional background\n', 30);
        await typeText('▶ Hands-on experience using AI tools to solve real business problems\n', 30);
        await typeText('▶ Thrives in ambiguous, fast-paced environments\n', 30);
        await typeText('\n', 30);
        
        // Experience section
        await typeText('EXPERIENCE\n', 40);
        await typeText('────────────────────────────────────────────────────────────────\n', 20);
        await typeText('Digital Growth Specialist\n', 30);
        await typeText('Craig Hite LLC • 2023 - Present\n', 30);
        await typeText('▶ Drove content strategy through TikTok campaigns for heavy equipment software\n', 30);
        await typeText('▶ Built company website using Readymag, enhancing digital presence\n', 30);
        await typeText('▶ Leveraged AI tools to streamline content creation workflows\n', 30);
        await typeText('\n', 30);
        await typeText('Sales Associate\n', 30);
        await typeText('Tommy Bahama • 2021 - 2023\n', 30);
        await typeText('▶ Consistently met and exceeded sales targets through personalized engagement\n', 30);
        await typeText('▶ Developed strong interpersonal skills through customer interactions\n', 30);
        await typeText('\n', 30);
        
        // Key Projects section
        await typeText('KEY PROJECTS\n', 40);
        await typeText('────────────────────────────────────────────────────────────────\n', 20);
        await typeText('Brick Bot - AI-Powered Crypto Intelligence Bot\n', 30);
        await typeText('Tech Stack: Node.js • Twitter API • Railway Cloud • AI/ML\n', 30);
        await typeText('▶ Vibe-coded autonomous bot providing real-time cryptocurrency market analysis\n', 30);
        await typeText('▶ Integrated multiple APIs for social media trend discovery\n', 30);
        await typeText('▶ Deployed scalable application to cloud infrastructure\n', 30);
        await typeText('▶ Implemented AI-driven personality algorithms for user engagement\n', 30);
        await typeText('\n', 30);
        
        // Technical Skills section
        await typeText('TECHNICAL SKILLS\n', 40);
        await typeText('────────────────────────────────────────────────────────────────\n', 20);
        await typeText('AI & Development\n', 30);
        await typeText('AI Tools • JavaScript/Node.js • Python • API Integration • Cloud Deployment\n', 30);
        await typeText('\n', 30);
        await typeText('Growth & Strategy\n', 30);
        await typeText('Content Strategy • Social Media Growth • Problem Solving • Adaptability • Global Perspective\n', 30);
        await typeText('\n', 30);
        
        // Education section
        await typeText('EDUCATION\n', 40);
        await typeText('────────────────────────────────────────────────────────────────\n', 20);
        await typeText('University of Alabama\n', 30);
        await typeText('Finance Coursework • 2021\n', 30);
        await typeText('\n', 30);
        await typeText('High School Diploma\n', 30);
        await typeText('Demonstrated resilience through transitions • 2021\n', 30);
        await typeText('\n', 30);
        
        addLine('', 'output-line');
        addLine('🎉 Resume generation complete! ✅ Type "clear" to reset.', 'output-line result-line');
        currentStep = 'complete';
    }
    
    // Show secret message when user says no
    async function showSecretMessage() {
        await typeText('shh you\'ll love it! :)\n', 40);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await typeText('\n', 30);
        generateResume();
    }
    
    // Start the terminal experience
    async function startTerminal() {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Type hello
        await typeText('> Hello!\n', 50);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Ask about resume
        await typeText('> would you like to generate Jace Hite\'s resume? y/n\n', 40);
        await typeText('> ', 40, true);
        
        currentStep = 'waiting-for-resume-response';
        waitingForResponse = true;
    }
    
    // Initialize
    startTerminal();
});