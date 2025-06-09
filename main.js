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

  // Mousedown to initiate potential drag
  card.addEventListener("mousedown", (e) => {
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

    // isDragging will be set to true by the global mousemove listener on the first actual move.
  });

  // Right click to delete
  card.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    card.remove();
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
  if (isDragging) {
    const x = e.clientX - dragOffset.x;
    const y = e.clientY - dragOffset.y;
    currentDragCard.style.left = `${x}px`;
    currentDragCard.style.top = `${y}px`;
  }
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
