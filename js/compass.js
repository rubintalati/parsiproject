/**
 * Parsi Project Compass Component
 * Adds a compass that shows direction based on device orientation
 */

// Create and inject the compass HTML and CSS
function initCompass() {
  // Create the compass container
  const compassContainer = document.createElement('div');
  compassContainer.className = 'parsi-compass-container';
  
  // Create the compass HTML structure
  compassContainer.innerHTML = `
    <div class="parsi-compass">
      <div class="parsi-compass-circle"></div>
      <div class="parsi-compass-point"></div>
    </div>
    <button class="parsi-compass-btn">Show Direction</button>
  `;
  
  // Find the container element
  const containerElement = document.querySelector('.container');
  
  if (containerElement) {
    // Add the compass to the container
    containerElement.appendChild(compassContainer);
    // Make sure the container has position relative for proper absolute positioning
    containerElement.style.position = 'relative';
  } else {
    // Fallback: Insert at the top of the body
    document.body.insertBefore(compassContainer, document.body.firstChild);
  }
  
  // Add compass stylesheet if not already present
  if (!document.getElementById('parsi-compass-styles')) {
    const compassStyles = document.createElement('style');
    compassStyles.id = 'parsi-compass-styles';
    compassStyles.textContent = `
      .parsi-compass-container {
        position: absolute;
        top: 20px;
        right: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        transition: opacity 0.3s ease;
        z-index: 10;
      }
      
      @media (max-width: 768px) {
        .parsi-compass-container {
          top: 10px;
          right: 10px;
        }
        
        .parsi-compass {
          width: 120px !important;
          height: 120px !important;
          background-color: transparent !important;
          box-shadow: none !important;
        }
        
        .parsi-compass-btn {
          font-size: 10px !important;
          padding: 4px 8px !important;
          top: -5px !important;
          background-color: rgba(0, 0, 0, 0.4) !important;
        }
      }
      
      .parsi-compass {
        position: relative;
        width: 150px;
        height: 150px;
        margin: auto;
        background-color: transparent;
      }
      
      .parsi-compass-circle {
        position: absolute;
        width: 100%;
        height: 100%;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        transition: transform 0.1s ease-out;
        background: url("../../media/images/compass.png") center no-repeat;
        background-size: contain;
      }
      
      .parsi-compass-point {
        opacity: 0;
        position: absolute;
        width: 20%;
        height: 20%;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #0ff;
        border-radius: 50%;
        transition: opacity 0.5s ease-out;
        box-shadow: 0 0 15px #0ff;
      }
      
      .parsi-compass-btn {
        position: absolute;
        top: -5px;
        left: 50%;
        transform: translateX(-50%);
        padding: 5px 10px;
        background-color: rgba(0, 0, 0, 0.6);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.3s;
        white-space: nowrap;
      }
      
      .parsi-compass-btn:hover {
        background-color: rgba(0, 0, 0, 0.8);
      }
      

    `;
    document.head.appendChild(compassStyles);
  }
  
  // Set up the compass functionality
  const compassCircle = document.querySelector(".parsi-compass-circle");
  const startBtn = document.querySelector(".parsi-compass-btn");
  const compassPoint = document.querySelector(".parsi-compass-point");
  
  // Demo mode when no orientation is available
  let demoMode = false;
  let demoAngle = 0;
  let demoInterval;
  
  function startCompass() {
    // Check if we need to request permission (iOS 13+)
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then(response => {
          if (response === 'granted') {
            // Permission granted, add the event listener
            window.addEventListener("deviceorientation", handleOrientation, true);
            compassPoint.style.opacity = 1;
            startBtn.textContent = "Direction Active";
          } else {
            // Permission denied, use demo mode
            startDemoMode();
          }
        })
        .catch(error => {
          // Handle errors (e.g., not triggered by user gesture)
          console.error("Error requesting orientation permission:", error);
          startDemoMode();
        });
    } else {
      // For non-iOS 13+ devices, try to use the appropriate event
      if (window.DeviceOrientationEvent) {
        if ('ondeviceorientationabsolute' in window) {
          // Android typically uses this
          window.addEventListener("deviceorientationabsolute", handleOrientation, true);
        } else {
          // Fall back to regular orientation event
          window.addEventListener("deviceorientation", handleOrientation, true);
        }
        compassPoint.style.opacity = 1;
        startBtn.textContent = "Direction Active";
      } else {
        // Device orientation not supported, use demo mode
        startDemoMode();
      }
    }
  }
  
  function startDemoMode() {
    demoMode = true;
    compassPoint.style.opacity = 1;
    startBtn.textContent = "Demo Active";
    
    // Clear any existing interval
    if (demoInterval) clearInterval(demoInterval);
    
    // Rotate compass slowly to simulate movement
    demoInterval = setInterval(() => {
      demoAngle = (demoAngle + 1) % 360;
      updateCompassHeading(demoAngle);
    }, 100);
  }
  
  function handleOrientation(e) {
    // If we're in demo mode, clear it when we get real readings
    if (demoMode && demoInterval) {
      clearInterval(demoInterval);
      demoMode = false;
    }
    
    // Check what property to use for the compass heading
    let compassHeading;
    
    // iOS provides the compass heading directly
    if (e.webkitCompassHeading) {
      compassHeading = e.webkitCompassHeading;
    } else if (e.absolute === true && e.alpha !== null) {
      // Android: calculate from alpha angle
      compassHeading = e.alpha;
    } else if (e.alpha !== null) {
      // Fallback for other devices
      compassHeading = 360 - e.alpha;
    } else {
      // Use demo mode if real heading is not available
      if (!demoMode) startDemoMode();
      return;
    }
    
    updateCompassHeading(compassHeading);
  }
  
  function updateCompassHeading(heading) {
    // Rotate the compass face to point north
    compassCircle.style.transform = `translate(-50%, -50%) rotate(${-heading}deg)`;
  }
  
  // Set up the button event handler
  startBtn.addEventListener("click", startCompass);
}

// Initialize compass when DOM is loaded
document.addEventListener('DOMContentLoaded', initCompass);
