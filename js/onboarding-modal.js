/**
 * Parsi Project Onboarding Modal
 * 
 * This script handles the onboarding modal for user profile management.
 * It collects user information and stores it in localStorage.
 * The modal only opens when the user clicks on their profile.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Check if user data exists and update profile
    const userData = JSON.parse(localStorage.getItem('parsiUser')) || {
        firstName: 'guest',
        lastName: '',
        type: 'visitor',
        avatar: '0'
    };
    
    // Update user profile in the sidebar with existing or default data
    updateUserProfile();
    
    // Add click event to user profile to open modal
    const userProfile = document.querySelector('.user-profile');
    if (userProfile) {
        userProfile.addEventListener('click', function() {
            showOnboardingModal();
        });
        userProfile.style.cursor = 'pointer';
    }
    
    function showOnboardingModal() {
        // Check if modal already exists
        if (document.querySelector('.modal-overlay')) {
            return;
        }
        
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'onboarding-modal';
        
        // Get existing user data
        const userData = JSON.parse(localStorage.getItem('parsiUser')) || {
            firstName: 'guest',
            lastName: '',
            type: 'visitor',
            avatar: '0'
        };
        
        // Set modal HTML content
        modalContent.innerHTML = `
            <div class="modal-header">
                <h2>${userData.firstName !== 'guest' ? 'update your profile' : 'add yourself to the community'}</h2>
                <p>${userData.firstName !== 'guest' ? 'change your information below' : 'to get going, this is important!'}</p>
            </div>
            
            <div class="modal-body">
                <div class="input-group">
                    <input type="text" id="firstName" placeholder="your first name" value="${userData.firstName !== 'guest' ? userData.firstName : ''}" required>
                    <input type="text" id="lastName" placeholder="your last name" value="${userData.lastName || ''}" required>
                </div>
                
                <div class="avatar-selection">
                    <div class="avatar-option ${userData.avatar === '0' ? 'selected' : ''}" data-avatar="0"></div>
                    <div class="avatar-option ${userData.avatar === '1' ? 'selected' : ''}" data-avatar="1"></div>
                    <div class="avatar-option ${userData.avatar === '2' ? 'selected' : ''}" data-avatar="2"></div>
                    <div class="avatar-option ${userData.avatar === '3' ? 'selected' : ''}" data-avatar="3"></div>
                </div>
                
                <div class="identity-selection">
                    <button class="identity-btn ${userData.type === 'girl' ? 'selected' : ''}" data-type="girl">parsi girl</button>
                    <button class="identity-btn ${userData.type === 'boy' ? 'selected' : ''}" data-type="boy">parsi boy</button>
                    <button class="identity-btn ${userData.type === 'person' ? 'selected' : ''}" data-type="person">parsi person</button>
                </div>
                
                <p class="note">even if you are not a parsi by birth, you are now a parsi by curiosity</p>
                
                <button id="submitBtn" ${(userData.firstName && userData.firstName !== 'guest' && userData.lastName && userData.type && userData.type !== 'visitor') ? '' : 'disabled'}>
                    ${userData.firstName !== 'guest' ? 'update my profile' : 'come on, add me quick'}
                </button>
            </div>
        `;
        
        // Append modal to body
        document.body.appendChild(modalOverlay);
        modalOverlay.appendChild(modalContent);
        
        // Variables to track user selections
        let selectedAvatar = userData.avatar || '0';
        let selectedType = userData.type !== 'visitor' ? userData.type : null;
        
        // Add event listeners for avatar selection
        const avatarOptions = document.querySelectorAll('.avatar-option');
        avatarOptions.forEach(option => {
            option.addEventListener('click', function() {
                // Remove selected class from all options
                avatarOptions.forEach(opt => opt.classList.remove('selected'));
                // Add selected class to clicked option
                this.classList.add('selected');
                // Store selected avatar
                selectedAvatar = this.getAttribute('data-avatar');
                // Check if form is valid
                checkFormValidity();
            });
        });
        
        // Add event listeners for identity selection
        const identityButtons = document.querySelectorAll('.identity-btn');
        identityButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Remove selected class from all buttons
                identityButtons.forEach(btn => btn.classList.remove('selected'));
                // Add selected class to clicked button
                this.classList.add('selected');
                // Store selected type
                selectedType = this.getAttribute('data-type');
                // Check if form is valid
                checkFormValidity();
            });
        });
        
        // Add event listener for submit button
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.addEventListener('click', function() {
            const firstName = document.getElementById('firstName').value.trim();
            const lastName = document.getElementById('lastName').value.trim();
            
            if (firstName && lastName && selectedAvatar !== null && selectedType) {
                // Save user data to localStorage
                const userData = {
                    firstName: firstName,
                    lastName: lastName,
                    type: selectedType,
                    avatar: selectedAvatar
                };
                
                localStorage.setItem('parsiUser', JSON.stringify(userData));
                
                // Remove modal
                document.body.removeChild(modalOverlay);
                
                // Update user profile in sidebar
                updateUserProfile();
            }
        });
        
        // Add event listeners for input fields
        const firstNameInput = document.getElementById('firstName');
        const lastNameInput = document.getElementById('lastName');
        
        firstNameInput.addEventListener('input', checkFormValidity);
        lastNameInput.addEventListener('input', checkFormValidity);
        
        // Function to check if form is valid
        function checkFormValidity() {
            const firstName = firstNameInput.value.trim();
            const lastName = lastNameInput.value.trim();
            
            if (firstName && lastName && selectedAvatar !== null && selectedType) {
                submitBtn.disabled = false;
            } else {
                submitBtn.disabled = true;
            }
        }
        
        // Prevent clicks on modal from bubbling to overlay
        modalContent.addEventListener('click', function(e) {
            e.stopPropagation();
        });
        
        // Close modal when clicking outside
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === modalOverlay) {
                document.body.removeChild(modalOverlay);
            }
        });
    }
    
    function updateUserProfile() {
        // Get user data from localStorage
        const userData = JSON.parse(localStorage.getItem('parsiUser')) || {
            firstName: 'guest',
            lastName: '',
            type: 'visitor',
            avatar: '0'
        };
        
        // Find user profile elements in the sidebar
        const userProfileContainer = document.querySelector('.user-profile');
        
        if (userProfileContainer) {
            const avatarElement = userProfileContainer.querySelector('.avatar');
            const userNameElement = userProfileContainer.querySelector('.user-name');
            const userStatusElement = userProfileContainer.querySelector('.user-status');
            
            if (avatarElement && userNameElement && userStatusElement) {
                // Update avatar with first initial or default
                const initial = userData.firstName !== 'guest' ? userData.firstName.charAt(0).toUpperCase() : 'G';
                avatarElement.textContent = initial;
                
                // Add avatar styling based on selected avatar
                avatarElement.style.backgroundColor = getAvatarColor(userData.avatar);
                
                // Update user name and status
                userNameElement.textContent = userData.firstName.toLowerCase();
                userStatusElement.textContent = 'parsi ' + userData.type;
            }
        }
    }
    
    // Helper function to get avatar color based on selection
    function getAvatarColor(avatarId) {
        const colors = [
            'rgba(255, 255, 255, 0.8)',  // Default light
            'rgba(255, 200, 100, 0.8)',  // Warm yellow
            'rgba(100, 200, 255, 0.8)',  // Cool blue
            'rgba(200, 100, 200, 0.8)'   // Purple
        ];
        
        return colors[parseInt(avatarId) || 0];
    }
});
