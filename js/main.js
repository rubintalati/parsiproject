document.addEventListener('DOMContentLoaded', function() {
    const questionSlider = document.getElementById('questionSlider');
    const questionItems = document.querySelectorAll('.question-item');
    const activeQuestionText = document.getElementById('activeQuestionText');
    const selectionBox = document.getElementById('selectionBox');
    const itemHeight = 60; // Height of each question item
    const totalItems = questionItems.length;
    let currentIndex = 2; // Start with the middle item active
    let autoScrollInterval;
    let isDragging = false;
    let startY, startTranslate;

    // Initialize position
    function initializePosition() {
        // Set initial transform to center the active item
        updateSliderPosition();
        
        // Set active class to current item
        updateActiveItem();
    }

    // Update slider position based on current index
    function updateSliderPosition() {
        const translateY = -currentIndex * itemHeight + (300 - itemHeight) / 2;
        questionSlider.style.transform = `translateY(${translateY}px)`;
    }

    // Update which item is active
    function updateActiveItem() {
        // Update active class
        questionItems.forEach((item, index) => {
            if (index === currentIndex) {
                item.classList.add('active');
                // Update the text in the static selection box
                const text = item.querySelector('span').textContent.trim();
                activeQuestionText.textContent = text;
                // Update href of selection box
                selectionBox.href = item.getAttribute('data-link');
            } else {
                item.classList.remove('active');
            }
        });
    }

    // Move to next item
    function moveToNextItem() {
        currentIndex = (currentIndex + 1) % totalItems;
        updateSliderPosition();
        updateActiveItem();
    }

    // Click handler for items
    function onItemClick(e) {
        const clickedItem = e.currentTarget;
        const clickedIndex = parseInt(clickedItem.getAttribute('data-index'));
        
        // Only update if clicking a different item
        if (clickedIndex !== currentIndex) {
            currentIndex = clickedIndex;
            updateSliderPosition();
            updateActiveItem();
            
            // Reset auto-scroll timer
            resetAutoScroll();
            
            // Prevent navigation when just selecting
            e.preventDefault();
        }
        // Allow navigation if clicking the same item again
    }

    // Touch/Mouse events for dragging
    function onDragStart(e) {
        isDragging = true;
        startY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
        startTranslate = getCurrentTranslateY();
        
        // Pause auto-scroll during drag
        clearInterval(autoScrollInterval);
        
        // Add event listeners for move and end
        document.addEventListener('touchmove', onDragMove, { passive: false });
        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('touchend', onDragEnd);
        document.addEventListener('mouseup', onDragEnd);
        
        e.preventDefault();
    }

    function onDragMove(e) {
        if (!isDragging) return;
        
        const currentY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
        const deltaY = currentY - startY;
        
        const newTranslate = startTranslate + deltaY;
        questionSlider.style.transform = `translateY(${newTranslate}px)`;
        
        e.preventDefault();
    }

    function onDragEnd(e) {
        isDragging = false;
        
        // Calculate which item is closest to center
        const currentTranslate = getCurrentTranslateY();
        const centerPosition = (300 - itemHeight) / 2;
        const offset = currentTranslate - centerPosition;
        const itemOffset = Math.round(offset / itemHeight);
        
        // Calculate new index
        currentIndex = Math.max(0, Math.min(totalItems - 1, -itemOffset));
        
        // Update position and active item
        updateSliderPosition();
        updateActiveItem();
        
        // Reset auto-scroll
        resetAutoScroll();
        
        // Remove event listeners
        document.removeEventListener('touchmove', onDragMove);
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('touchend', onDragEnd);
        document.removeEventListener('mouseup', onDragEnd);
    }

    // Helper to get current translateY value
    function getCurrentTranslateY() {
        const style = window.getComputedStyle(questionSlider);
        const matrix = new DOMMatrixReadOnly(style.transform);
        return matrix.m42; // translateY value
    }

    // Auto-scroll function
    function startAutoScroll() {
        autoScrollInterval = setInterval(moveToNextItem, 5000);
    }

    // Reset auto-scroll timer
    function resetAutoScroll() {
        clearInterval(autoScrollInterval);
        startAutoScroll();
    }

    // Add click event listeners to all items
    questionItems.forEach(item => {
        item.addEventListener('click', onItemClick);
    });

    // Add drag event listeners to slider
    questionSlider.addEventListener('touchstart', onDragStart, { passive: false });
    questionSlider.addEventListener('mousedown', onDragStart);

    // Initialize position and start auto-scroll
    initializePosition();
    startAutoScroll();
});
