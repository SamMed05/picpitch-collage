// Dark mode functionality
let isDarkMode = false;

// Check for saved dark mode preference or default to system preference
if (
  localStorage.getItem("darkMode") === "true" ||
  (!localStorage.getItem("darkMode") &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches)
) {
  isDarkMode = true;
  document.documentElement.classList.add("dark");
}

// Update toggle button state
const darkToggle = document.getElementById("darkToggle");
function updateDarkToggle() {
  if (isDarkMode) {
    darkToggle.classList.add("active");
  } else {
    darkToggle.classList.remove("active");
  }
}
updateDarkToggle();

// Dark mode toggle handler
darkToggle.addEventListener("click", () => {
  isDarkMode = !isDarkMode;
  if (isDarkMode) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  localStorage.setItem("darkMode", isDarkMode.toString());
  updateDarkToggle();
});

// Listen for system theme changes
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (event) => {
    if (!localStorage.getItem("darkMode")) {
      isDarkMode = event.matches;
      if (isDarkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      updateDarkToggle();
    }
  });

let cardCount = 0;
let currentTargetCard = null; // For file input after click
let isDragging = false;       // True if a card is currently being dragged
// let dragStarted = false; // This variable will be replaced by hasDraggedThisInteraction
let dragOffset = { x: 0, y: 0 }; // Offset of mouse from card's top-left
let currentDragCard = null;   // The card element being dragged
let hasDraggedThisInteraction = false; // Flag to distinguish click from drag

const cardsContainer = document.getElementById("cardsContainer");
const fileInput = document.getElementById("fileInput");
const headerSection = document.getElementById("headerSection");
const pageContainer = document.getElementById("pageContainer");
let isHeaderVisible = true;

// random placement (allow overlap, less regular)
function getGridPosition(index, total) {
  const containerRect = cardsContainer.getBoundingClientRect();
  const cardWidth = window.innerWidth <= 768 ? 180 : 250;
  const cardHeight = window.innerWidth <= 768 ? 270 : 375;
  const margin = 20;
  return {
    x: Math.random() * (containerRect.width - cardWidth - margin * 2) + margin,
    y:
      Math.random() * (containerRect.height - cardHeight - margin * 2) + margin,
  };
}

function getRandomRotation() {
  return (Math.random() - 0.5) * 40; // -20 to +20 degrees
}

function getRandomZIndex() {
  return Math.floor(Math.random() * 100) + 1;
}

let longPressTimer;
let longPressStarted = false;

function setupCardEvents(card) {
  // Click to upload - only if not a drag
  card.addEventListener("click", (e) => {
    if (!hasDraggedThisInteraction) { // If no drag occurred during this mousedown-mouseup cycle
      currentTargetCard = card;
      fileInput.click();
    }
  });

  // Scroll wheel rotation
  card.addEventListener("wheel", (e) => {
    e.preventDefault();
    const currentTransform = card.style.transform || "";
    const rotateMatch = currentTransform.match(/rotate\(([^)]+)deg\)/);
    let currentRotation = rotateMatch ? parseFloat(rotateMatch[1]) : 0;

    const rotationStep = e.deltaY > 0 ? 5 : -5;
    currentRotation += rotationStep;

    card.style.transform =
      currentTransform.replace(/rotate\([^)]+deg\)/, "").trim() +
      ` rotate(${currentRotation}deg)`;
  });

  // CONSOLIDATED: Single mousedown handler for both drag and long-press
  card.addEventListener("mousedown", function (e) {
    if (e.button !== 0) return; // Only left click
    e.preventDefault(); // Prevent text selection, etc.

    hasDraggedThisInteraction = false; // Reset for this new interaction
    currentDragCard = card; // Tentatively set the card to be dragged

    // Calculate offset based on the card's current CSS left/top and mousedown position
    const cardStyle = window.getComputedStyle(card);
    const initialCardLeft = parseFloat(cardStyle.left);
    const initialCardTop = parseFloat(cardStyle.top);

    dragOffset.x = e.clientX - initialCardLeft;
    dragOffset.y = e.clientY - initialCardTop;

    // Start long-press timer
    longPressStarted = true;
    longPressTimer = setTimeout(() => {
      // Only delete if we haven't started dragging
      if (!isDragging) {
        // Vibrate if supported (mostly for mobile)
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        card.remove();
        longPressStarted = false;
        // Prevent drag from continuing
        currentDragCard = null;
      }
    }, 800); // 800ms for long press
  });

  // Drag and drop for images
  card.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (!isDragging) { // Check global isDragging, not a local one
      card.classList.add("drag-over");
    }
  });

  card.addEventListener("dragleave", () => {
    card.classList.remove("drag-over");
  });

  card.addEventListener("drop", (e) => {
    e.preventDefault();
    card.classList.remove("drag-over");

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith("image/")) {
      loadImageToCard(card, files[0]);
    }
  });


  card.addEventListener("mouseup", function () {
    if (longPressStarted) {
      clearTimeout(longPressTimer);
      longPressStarted = false;
    }
  });

  card.addEventListener("mouseleave", function () {
    if (longPressStarted) {
      clearTimeout(longPressTimer);
      longPressStarted = false;
    }
  });

  // Touch-based long press
  card.addEventListener("touchstart", function (e) {
    // Don't cancel click events immediately
    longPressStarted = true;
    longPressTimer = setTimeout(() => {
      if (!isDragging) {  // Only delete if we haven't started dragging
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        card.remove();
        longPressStarted = false;
        // Prevent click from triggering after long press
        hasDraggedThisInteraction = true;
      }
    }, 800);
  }, { passive: true });

  card.addEventListener("touchend", function () {
    if (longPressStarted) {
      clearTimeout(longPressTimer);
      longPressStarted = false;
    }
  });

  card.addEventListener("touchmove", function () {
    if (longPressStarted) {
      clearTimeout(longPressTimer);
      longPressStarted = false;
    }
  });
}


function createCard(index = 0, total = 1) {
  cardCount++;
  const card = document.createElement("div");
  const position = getGridPosition(index, total);
  const rotation = getRandomRotation();
  const zIndex = getRandomZIndex();

  // Get current size settings
  const sizeValue = +document.getElementById("sizeSlider").value;
  const isLandscape = document.getElementById("aspectToggle").checked;

  card.className =
    "card-container absolute bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 cursor-grab flex items-center justify-center";
  card.style.left = `${position.x}px`;
  card.style.top = `${position.y}px`;
  card.style.transform = `rotate(${rotation}deg)`;
  card.style.zIndex = zIndex;
  card.style.borderRadius = "50px";
  card.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.15)";
  card.id = `card-${cardCount}`;

  // Set correct aspect ratio
  if (isLandscape) {
    card.style.width = `${(sizeValue * 3) / 2}px`;
    card.style.height = `${sizeValue}px`;
  } else {
    card.style.width = `${sizeValue}px`;
    card.style.height = `${(sizeValue * 3) / 2}px`;
  }

  card.innerHTML = `
                <div class="placeholder-icon text-gray-400 dark:text-gray-500 text-center">
                    <svg class="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <p class="text-sm">Click or drag image</p>
                </div>
            `;

  setupCardEvents(card);
  cardsContainer.appendChild(card);
  return card;
}

function loadImageToCard(card, file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    card.innerHTML = `<img src="${e.target.result}" class="card-image" alt="Uploaded image">`;
    card.style.padding = "0";
  };
  reader.readAsDataURL(file);
}

// Global mouse events for dragging
document.addEventListener("mousemove", (e) => {
  if (!currentDragCard) return; // No card selected for dragging via mousedown

  // This is the first mousemove after mousedown on currentDragCard
  // Clear long-press timer BEFORE setting isDragging to true
  if (longPressStarted) {
    clearTimeout(longPressTimer);
    longPressStarted = false;
  }

  if (!isDragging) {
    isDragging = true;
    hasDraggedThisInteraction = true; // Mark that a drag has occurred

    currentDragCard.classList.add("dragging");
    currentDragCard.style.cursor = "grabbing";

    // Preserve rotation and add scale
    const tf = currentDragCard.style.transform || "";
    const m = tf.match(/rotate\((-?\d+(\.\d+)?)deg\)/);
    const rot = m ? parseFloat(m[1]) : 0;
    currentDragCard.style.transform = `rotate(${rot}deg) scale(1.05)`;
  }

  // If dragging is active (either just started or continuing)
  const x = e.clientX - dragOffset.x;
  const y = e.clientY - dragOffset.y;
  currentDragCard.style.left = `${x}px`;
  currentDragCard.style.top = `${y}px`;
});

document.addEventListener("mouseup", () => {
  if (isDragging && currentDragCard) {
    // Reset visual dragging state from the card that was being dragged
    const tf = currentDragCard.style.transform || "";
    const m = tf.match(/rotate\((-?\d+(\.\d+)?)deg\)/);
    const rot = m ? parseFloat(m[1]) : 0;
    currentDragCard.style.transform = `rotate(${rot}deg)`; // Remove scale

    currentDragCard.classList.remove("dragging");
    currentDragCard.style.cursor = "grab";
  }

  // Reset global dragging state variables
  isDragging = false;
  currentDragCard = null;
  // hasDraggedThisInteraction is reset on the next mousedown
});

// File input handler
fileInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0 && currentTargetCard) {
    loadImageToCard(currentTargetCard, e.target.files[0]);
    currentTargetCard = null;
  }
});

// Add card button
document.getElementById("addCard").addEventListener("click", () => {
  const existingCards = document.querySelectorAll(".card-container").length;
  for (let i = 0; i < 3; i++) {
    createCard(existingCards + i, existingCards + 3);
  }
});

// Clear all button
document.getElementById("clearAll").addEventListener("click", () => {
  cardsContainer.innerHTML = "";
  cardCount = 0;
});

// aspect-ratio toggle & size slider
const aspectToggle = document.getElementById("aspectToggle");
const sizeSlider = document.getElementById("sizeSlider");

function updateCardSizes() {
  const v = +sizeSlider.value;
  const land = aspectToggle.checked;
  document.querySelectorAll(".card-container").forEach((card) => {
    if (land) {
      card.style.width = `${(v * 3) / 2}px`;
      card.style.height = `${v}px`;
    } else {
      card.style.width = `${v}px`;
      card.style.height = `${(v * 3) / 2}px`;
    }
  });
}

aspectToggle.addEventListener("change", updateCardSizes);
sizeSlider.addEventListener("input", updateCardSizes);

// Help tooltip
const helpTooltip = document.getElementById("helpTooltip");
const helpContent = document.getElementById("helpContent");
let helpTimeout;
let isHelpVisible = false;

function showHelp() {
  clearTimeout(helpTimeout);
  helpContent.classList.add("show");
  isHelpVisible = true;
}

function hideHelp() {
  helpTimeout = setTimeout(() => {
    helpContent.classList.remove("show");
    isHelpVisible = false;
  }, 200);
}

helpTooltip.addEventListener("mouseenter", showHelp);
helpTooltip.addEventListener("mouseleave", hideHelp);
helpTooltip.addEventListener("click", (e) => {
  e.stopPropagation();
  if (isHelpVisible) {
    helpContent.classList.remove("show");
    isHelpVisible = false;
  } else {
    showHelp();
  }
});

helpContent.addEventListener("mouseenter", () => {
  clearTimeout(helpTimeout);
});

helpContent.addEventListener("mouseleave", hideHelp);

// Close help when clicking outside
document.addEventListener("click", (e) => {
  if (!helpTooltip.contains(e.target) && !helpContent.contains(e.target)) {
    helpContent.classList.remove("show");
    isHelpVisible = false;
  }
});

// Prevent default drag behavior on the whole page
document.addEventListener("dragover", (e) => e.preventDefault());
document.addEventListener("drop", (e) => e.preventDefault());

// Toggle header visibility
document.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'h') {
    // Prevent toggling if an input field is focused (e.g., future search bar)
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
      return;
    }

    isHeaderVisible = !isHeaderVisible;
    if (isHeaderVisible) {
      headerSection.classList.remove('hidden');
      pageContainer.style.paddingTop = ''; // Revert to CSS p-4
    } else {
      headerSection.classList.add('hidden');
      pageContainer.style.paddingTop = '0px';
    }
  }
});

// Initialize with some cards
for (let i = 0; i < 6; i++) {
  createCard(i, 6);
}

// Handle window resize
window.addEventListener("resize", () => {
  const cards = document.querySelectorAll(".card-container");
  cards.forEach((card, index) => {
    const rect = card.getBoundingClientRect();
    const containerRect = cardsContainer.getBoundingClientRect();

    if (
      rect.right > containerRect.right ||
      rect.bottom > containerRect.bottom
    ) {
      const newPos = getGridPosition(index, cards.length);
      card.style.left = `${newPos.x}px`;
      card.style.top = `${newPos.y}px`;
    }
  });
});


// Add touch support for mobile devices
function enableTouchSupport() {
  // Handle touch events for card dragging
  document.addEventListener("touchstart", function (e) {
    // Find if we're touching a card
    let element = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
    let cardElement = null;

    // Find card container parent
    while (element && !cardElement) {
      if (element.classList.contains('card-container')) {
        cardElement = element;
        break;
      }
      element = element.parentElement;
    }

    if (cardElement) {
      // ONLY handle drag initialization here, not long press
      // Convert touch to mouse event for compatibility with existing code
      const touch = e.touches[0];
      hasDraggedThisInteraction = false;
      currentDragCard = cardElement;

      // Calculate drag offset as in mousedown
      const cardStyle = window.getComputedStyle(cardElement);
      dragOffset.x = touch.clientX - parseFloat(cardStyle.left);
      dragOffset.y = touch.clientY - parseFloat(cardStyle.top);
    }
  }, { passive: false });

  // Handle touch move for dragging
  document.addEventListener("touchmove", function (e) {
    if (currentDragCard) {
      e.preventDefault(); // Prevent scrolling while dragging

      // Clear long-press timer as soon as movement is detected
      if (longPressStarted) {
        clearTimeout(longPressTimer);
        longPressStarted = false;
      }

      const touch = e.touches[0];

      // First touch move triggers dragging state
      if (!isDragging) {
        isDragging = true;
        hasDraggedThisInteraction = true;
        currentDragCard.classList.add("dragging");
        currentDragCard.style.cursor = "grabbing";

        // Add scale effect as in mousemove
        const tf = currentDragCard.style.transform || "";
        const m = tf.match(/rotate\((-?\d+(\.\d+)?)deg\)/);
        const rot = m ? parseFloat(m[1]) : 0;
        currentDragCard.style.transform = `rotate(${rot}deg) scale(1.05)`;
      }

      // Update position
      const x = touch.clientX - dragOffset.x;
      const y = touch.clientY - dragOffset.y;
      currentDragCard.style.left = `${x}px`;
      currentDragCard.style.top = `${y}px`;
    }
  }, { passive: false });

  // Handle touch end
  document.addEventListener("touchend", function () {
    if (isDragging && currentDragCard) {
      // Reset styles as in mouseup
      const tf = currentDragCard.style.transform || "";
      const m = tf.match(/rotate\((-?\d+(\.\d+)?)deg\)/);
      const rot = m ? parseFloat(m[1]) : 0;
      currentDragCard.style.transform = `rotate(${rot}deg)`;

      currentDragCard.classList.remove("dragging");
      currentDragCard.style.cursor = "grab";

      // If no drag occurred, treat as click
      if (!hasDraggedThisInteraction) {
        currentTargetCard = currentDragCard;
        fileInput.click();
      }
    }

    // Reset drag state
    isDragging = false;
    currentDragCard = null;
  });

  // Touch support for help tooltip
  helpTooltip.addEventListener("touchstart", function (e) {
    e.preventDefault();
    if (isHelpVisible) {
      helpContent.classList.remove("show");
      isHelpVisible = false;
    } else {
      showHelp();
    }
  });

  // Touch support for card rotation (double tap to rotate)
  let lastTapTime = 0;
  document.addEventListener("touchend", function (e) {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapTime;

    // Detect double tap
    if (tapLength < 500 && tapLength > 0) {
      let element = document.elementFromPoint(
        e.changedTouches[0].clientX,
        e.changedTouches[0].clientY
      );
      let cardElement = null;

      // Find card container parent
      while (element && !cardElement) {
        if (element.classList.contains('card-container')) {
          cardElement = element;
          break;
        }
        element = element.parentElement;
      }

      if (cardElement) {
        // Rotate card on double tap
        const currentTransform = cardElement.style.transform || "";
        const rotateMatch = currentTransform.match(/rotate\(([^)]+)deg\)/);
        let currentRotation = rotateMatch ? parseFloat(rotateMatch[1]) : 0;

        // Rotate by 15 degrees
        currentRotation += 15;

        cardElement.style.transform =
          currentTransform.replace(/rotate\([^)]+deg\)/, "").trim() +
          ` rotate(${currentRotation}deg)`;
      }
    }

    lastTapTime = currentTime;
  });
}


let mobileMenuExists = false;

// Create function to manage mobile menu
function manageMobileMenu() {
  mobileMenuExists = !!document.querySelector('.controls-menu-button');

  if (window.innerWidth <= 480 && !mobileMenuExists) {
    // Create panel overlay
    const overlay = document.createElement("div");
    overlay.className = "panel-overlay";
    document.body.appendChild(overlay);

    // Create the floating menu button - will transform to X when menu is open
    const menuButton = document.createElement("button");
    menuButton.className = "controls-menu-button";
    menuButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="menu-icon">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
      </svg>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="close-icon hidden">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    `;
    menuButton.style.zIndex = "9999";
    menuButton.style.position = "fixed";
    menuButton.style.top = "15px";
    menuButton.style.right = "15px";
    document.body.appendChild(menuButton);

    // Create the controls panel
    const controlsPanel = document.createElement("div");
    controlsPanel.className = "controls-panel";

    // Panel header - simplified without X button
    const panelHeader = document.createElement("div");
    panelHeader.className = "controls-panel-header";
    panelHeader.innerHTML = `
      <div class="controls-panel-title dark:text-white">Controls</div>
    `;
    controlsPanel.appendChild(panelHeader);

    // Group 1: Theme toggle - Fix layout issues
    const themeGroup = document.createElement("div");
    themeGroup.className = "control-group";
    themeGroup.innerHTML = `
      <div class="flex items-center justify-between w-full">
        <span class="text-sm dark:text-white">Dark Mode</span>
        <button id="darkToggleMobile" class="dark-toggle relative" title="Toggle dark mode" style="width: 40px; flex-shrink: 0;">
          <span class="toggle-icon-sun absolute left-1 top-1/2 transform -translate-y-1/2" aria-hidden="true">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="text-yellow-400">
              <circle cx="12" cy="12" r="5" stroke-width="2" />
              <path stroke-width="2" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </span>
          <span class="toggle-icon-moon absolute right-1 top-1/2 transform -translate-y-1/2" aria-hidden="true">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="text-gray-500 dark:text-yellow-300">
              <path stroke-width="2" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
            </svg>
          </span>
        </button>
      </div>
    `;
    controlsPanel.appendChild(themeGroup);

    // Group 2: Card settings - Fix alignment issues
    const cardGroup = document.createElement("div");
    cardGroup.className = "control-group";
    cardGroup.innerHTML = `
      <div class="mb-3">
        <label class="flex items-center text-sm dark:text-white">
          <input type="checkbox" id="aspectToggleMobile" class="mr-2 custom-checkbox">
          Landscape Mode
        </label>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-sm dark:text-white mr-3">Card Size</span>
        <input type="range" id="sizeSliderMobile" min="100" max="600" value="250" class="flex-grow custom-slider">
      </div>
    `;
    controlsPanel.appendChild(cardGroup);

    // Group 3: Action buttons
    const actionGroup = document.createElement("div");
    actionGroup.className = "control-group";
    actionGroup.innerHTML = `
      <button id="addCardMobile" class="bg-primary text-white rounded-full hover:bg-opacity-90 transition-colors py-2">
        Add Cards
      </button>
      <button id="clearAllMobile" class="bg-red-500 text-white rounded-full hover:bg-opacity-90 transition-colors py-2">
        Clear All
      </button>
    `;
    controlsPanel.appendChild(actionGroup);

    // Add help text
    const helpText = document.createElement("div");
    helpText.className = "text-xs text-gray-500 dark:text-gray-400 mt-2";
    helpText.innerHTML = `
      <p>• Double-tap cards to rotate</p>
      <p>• Long-press to delete a card</p>
      <p>• Drag to move cards around</p>
    `;
    controlsPanel.appendChild(helpText);

    // Make sure the panel is hidden initially
    controlsPanel.style.transform = "translateX(100%)";
    document.body.appendChild(controlsPanel);

    // Sync mobile controls with main controls
    const darkToggleMobile = document.getElementById("darkToggleMobile");
    const aspectToggleMobile = document.getElementById("aspectToggleMobile");
    const sizeSliderMobile = document.getElementById("sizeSliderMobile");
    const addCardMobile = document.getElementById("addCardMobile");
    const clearAllMobile = document.getElementById("clearAllMobile");

    // Initialize mobile control states
    if (isDarkMode) {
      darkToggleMobile.classList.add("active");
    }

    // Only set these if the elements exist
    if (aspectToggle) aspectToggleMobile.checked = aspectToggle.checked;
    if (sizeSlider) sizeSliderMobile.value = sizeSlider.value;

    // Handle mobile controls events
    darkToggleMobile.addEventListener("click", () => {
      darkToggle.click(); // Trigger the main toggle
      darkToggleMobile.classList.toggle("active");
    });

    aspectToggleMobile.addEventListener("change", () => {
      aspectToggle.checked = aspectToggleMobile.checked;
      aspectToggle.dispatchEvent(new Event("change"));
    });

    sizeSliderMobile.addEventListener("input", () => {
      sizeSlider.value = sizeSliderMobile.value;
      sizeSlider.dispatchEvent(new Event("input"));
    });

    addCardMobile.addEventListener("click", () => {
      document.getElementById("addCard").click();
    });

    clearAllMobile.addEventListener("click", () => {
      document.getElementById("clearAll").click();
    });

    // Toggle panel visibility and transform menu button
    menuButton.addEventListener("click", () => {
      const menuIcon = menuButton.querySelector('.menu-icon');
      const closeIcon = menuButton.querySelector('.close-icon');

      if (controlsPanel.classList.contains('show')) {
        // Close panel
        controlsPanel.classList.remove("show");
        overlay.classList.remove("show");
        menuIcon.classList.remove("hidden");
        closeIcon.classList.add("hidden");
      } else {
        // Open panel
        controlsPanel.classList.add("show");
        overlay.classList.add("show");
        menuIcon.classList.add("hidden");
        closeIcon.classList.remove("hidden");
      }
    });

    // Close panel when clicking overlay
    overlay.addEventListener("click", () => {
      controlsPanel.classList.remove("show");
      overlay.classList.remove("show");
      menuButton.querySelector('.menu-icon').classList.remove("hidden");
      menuButton.querySelector('.close-icon').classList.add("hidden");
    });
  }
  else if (window.innerWidth > 480 && mobileMenuExists) {
    // Remove mobile menu when not needed
    const menuButton = document.querySelector('.controls-menu-button');
    const controlsPanel = document.querySelector('.controls-panel');
    const overlay = document.querySelector('.panel-overlay');

    if (menuButton) menuButton.remove();
    if (controlsPanel) controlsPanel.remove();
    if (overlay) overlay.remove();
  }
}

// Call on page load
document.addEventListener("DOMContentLoaded", function () {
  enableTouchSupport();
  manageMobileMenu();

  // For mobile, start with fewer cards
  if (window.innerWidth <= 480 && cardCount > 3) {
    const cards = document.querySelectorAll(".card-container");
    for (let i = 3; i < cards.length; i++) {
      cards[i].remove();
    }
    cardCount = 3;
  }
});

// Call on window resize
window.addEventListener("resize", manageMobileMenu);

