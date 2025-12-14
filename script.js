// Embedded font data - works offline
// Font data will be loaded from fonts_data.js or embedded here

// Initialize app when DOM is ready
(function() {
  function init() {
    // Check if fontBundle is loaded (check both global and window)
    const fontData = typeof fontBundle !== 'undefined' ? fontBundle : (typeof window !== 'undefined' && window.fontBundle);
    if (!fontData) {
      console.error('fontBundle is not defined. Make sure fonts_data.js is loaded before script.js');
      setTimeout(init, 100); // Retry after 100ms
      return;
    }
    
    // Use the font data - reference the global fontBundle
    // fontBundle should be available globally from fonts_data.js

    // Get references to all the necessary elements
    const textInput = document.getElementById("textInput");
    const fontSelect = document.getElementById("fontSelect");
    const prevFontBtn = document.getElementById("prevFontBtn");
    const nextFontBtn = document.getElementById("nextFontBtn");
    const fontHeightControls = document.getElementById("fontHeightControls");
    const fontHeightDisplay = document.getElementById("fontHeightDisplay");
    const decreaseSizeBtn = document.getElementById("decreaseSize");
    const increaseSizeBtn = document.getElementById("increaseSize");
    const previewCanvas = document.getElementById("previewCanvas");
    const downloadBtn = document.getElementById("downloadBtn");
    const hintText = document.getElementById("hintText");
    const pixelCountText = document.getElementById("pixelCount");
    const previewContainer = document.getElementById("previewContainer");
    const alignmentControls = document.getElementById("alignmentControls");
    const fontScaleControls = document.getElementById("fontScaleControls");
    const fontScaleRange = document.getElementById("fontScaleRange");
    const fontScaleDisplay = document.getElementById("fontScaleDisplay");
    const fontColorPicker = document.getElementById("fontColorPicker");
    const fontColorText = document.getElementById("fontColorText");

    // Dynamically populate font options from the loaded JSON data
    // Use fontData (which references fontBundle) to avoid scope issues
    const bundle = fontData;
    for (const key in bundle) {
      const option = document.createElement("option");
      option.value = `custom-${key}`;
      option.textContent = key;
      fontSelect.appendChild(option);
    }
    // Add system fonts (works offline)
    const webFonts = [
      { name: "Monospace (System)", value: "monospace" },
      { name: "Courier New", value: "Courier New, monospace" },
      { name: "Consolas", value: "Consolas, monospace" },
      { name: "Lucida Console", value: "Lucida Console, monospace" },
      { name: "Menlo", value: "Menlo, monospace" },
      { name: "Monaco", value: "Monaco, monospace" },
      { name: "Arial", value: "Arial, sans-serif" },
      { name: "Helvetica", value: "Helvetica, sans-serif" },
      { name: "Times New Roman", value: "Times New Roman, serif" },
      { name: "Georgia", value: "Georgia, serif" },
      { name: "Verdana", value: "Verdana, sans-serif" },
      { name: "Impact", value: "Impact, sans-serif" },
      { name: "Comic Sans MS", value: "Comic Sans MS, cursive" },
    ];
    webFonts.forEach((font) => {
      const option = document.createElement("option");
      option.value = font.value;
      option.textContent = font.name;
      fontSelect.appendChild(option);
    });

    // Create an offscreen canvas to handle the base text rendering
    const offscreenCanvas = document.createElement("canvas");
    const offscreenCtx = offscreenCanvas.getContext("2d");
    const previewCtx = previewCanvas.getContext("2d");

    let zoomLevel = 4; // Initial zoom level
    const maxZoom = 15;
    const minZoom = 1;
    let fontHeight = 16; // State variable for font height
    let customFontScale = 1; // New state variable for custom font scale

    let panX = 0;
    let panY = 0;
    let isPanning = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let lastPixelCount = 0;
    let currentAlignment = "left"; // New state variable for alignment
    let currentFontColor = "#000000"; // Current font color

    let touchStartX = 0;
    let touchStartY = 0;
    let lastDist = null;

    const isCustomFontSelected = () => {
      return fontSelect.value.startsWith("custom-");
    };

    /**
     * Renders a pixel font from a 1D or 2D array font data.
     * @param {object} fontDataParam The font data object containing character definitions.
     * @param {string} text The text to render.
     * @param {string} alignment The text alignment ('left', 'center', 'right').
     * @param {number} scale The uniform scaling factor.
     * @param {number} charSpacing The spacing between characters.
     * @param {number} lineSpacing The spacing between lines.
     * @returns {number} The total number of black pixels rendered.
     */
    const renderPixelFont = (
      fontDataParam,
      text,
      alignment,
      scale = 1,
      charSpacing = 1,
      lineSpacing = 1
    ) => {
      if (!text || !fontDataParam) return 0;
      const lines = text.split("\n");

      // Determine font dimensions based on the data structure
      const referenceChar = fontDataParam["A"] || fontDataParam["a"] || fontDataParam[" "];
      if (!referenceChar) {
        console.error("Could not find a reference character in the font data.");
        return 0;
      }

      let charWidth, charHeight;
      let is2D = Array.isArray(referenceChar[0]);

      if (is2D) {
        // 2D array format: [[0, 1, 0], [1, 0, 1]]
        charHeight = referenceChar.length;
      } else {
        // 1D array format: [0, 1, 0, 1, 0, 1]
        const fontName = Object.keys(bundle).find(
          (key) => bundle[key] === fontDataParam
        );
        if (fontName === "Microfont3x3") {
          charWidth = 3;
          charHeight = 3;
        } else if (fontName === "threeXFiveMinifont") {
          charWidth = 3;
          charHeight = 5;
        } else {
          console.error("Unknown 1D font format.");
          return 0;
        }
      }

      // Calculate total dimensions and individual line widths
      let maxRenderedLineWidth = 0;
      const charRenderData = [];

      lines.forEach((line) => {
        let lineWidth = 0;
        const lineChars = [];
        for (const char of line) {
          const charData =
            fontDataParam[char] || fontDataParam[char.toLowerCase()] || fontDataParam[" "];
          if (!charData) continue;

          let charRenderWidth = 0;
          let tempCharWidth = is2D
            ? charData[0]
              ? charData[0].length
              : 0
            : charWidth;
          if (char === " ") {
            charRenderWidth = 2; // Fixed space width
          } else {
            // Dynamically calculate character width based on non-empty columns
            let startCol = -1;
            let endCol = -1;
            for (let x = 0; x < tempCharWidth; x++) {
              for (let y = 0; y < charData.length; y++) {
                const pixelValue = is2D
                  ? charData[y]?.[x] // Use optional chaining to prevent error
                  : charData[y * tempCharWidth + x];
                if (pixelValue === 1) {
                  if (startCol === -1) startCol = x;
                  endCol = x;
                }
              }
            }
            if (startCol !== -1 && endCol !== -1) {
              charRenderWidth = endCol - startCol + 1;
            } else {
              charRenderWidth = 0;
            }
          }
          lineWidth += charRenderWidth + charSpacing;
          lineChars.push({
            data: charData,
            width: charRenderWidth,
            is2D: is2D,
          });
        }
        maxRenderedLineWidth = Math.max(maxRenderedLineWidth, lineWidth);
        charRenderData.push({ chars: lineChars, width: lineWidth });
      });

      const totalWidth = maxRenderedLineWidth * scale;
      const totalHeight =
        (lines.length * (charHeight + lineSpacing) - lineSpacing) * scale;

      offscreenCanvas.width = totalWidth;
      offscreenCanvas.height = totalHeight;
      offscreenCtx.clearRect(0, 0, totalWidth, totalHeight);

      let blackPixelCount = 0;
      let currentY = 0;

      charRenderData.forEach((lineData, i) => {
        const lineWidth = lineData.width * scale;
        let xOffset = 0;
        // Calculate xOffset based on alignment
        if (alignment === "center") {
          xOffset = Math.floor((totalWidth - lineWidth) / 2);
        } else if (alignment === "right") {
          xOffset = totalWidth - lineWidth;
        } else {
          // Default to left alignment
          xOffset = 0;
        }

        let currentX = xOffset;
        lineData.chars.forEach((char) => {
          const charData = char.data;
          const tempCharWidth = char.is2D
            ? charData[0]
              ? charData[0].length
              : 0
            : charWidth;

          // Find the start and end columns for this specific character
          let startCol = -1;
          let endCol = -1;
          for (let x = 0; x < tempCharWidth; x++) {
            for (let y = 0; y < charData.length; y++) {
              const pixelValue = char.is2D
                ? charData[y]?.[x]
                : charData[y * tempCharWidth + x];
              if (pixelValue === 1) {
                if (startCol === -1) startCol = x;
                endCol = x;
              }
            }
          }

          // Render the pixels within the character's bounding box
          if (startCol !== -1 && endCol !== -1) {
            for (let x = startCol; x <= endCol; x++) {
              for (let y = 0; y < charData.length; y++) {
                const pixelValue = char.is2D
                  ? charData[y]?.[x]
                  : charData[y * tempCharWidth + x];
                if (pixelValue === 1) {
                  // This is the core logic: a single pixel from the font data is rendered as an n x n square.
                  offscreenCtx.fillStyle = currentFontColor;
                  offscreenCtx.fillRect(
                    currentX + (x - startCol) * scale,
                    currentY + y * scale,
                    scale,
                    scale
                  );
                  // Update pixel count based on the scaled square
                  blackPixelCount += scale * scale;
                }
              }
            }
          } else if (char.data === fontDataParam[" "]) {
            // Handle spaces specifically
          }

          // Advance the drawing position for the next character
          currentX += (char.width + charSpacing) * scale;
        });
        currentY += (charHeight + lineSpacing) * scale;
      });
      return blackPixelCount;
    };

    // Function to draw text on the offscreen canvas
    const renderOffscreenText = () => {
      const text = textInput.value;
      const selectedFont = fontSelect.value;
      let pixelCount = 0;

      if (isCustomFontSelected()) {
        fontHeightControls.style.display = "none";
        fontScaleControls.style.display = "flex";
        const fontKey = selectedFont.replace("custom-", "");
        pixelCount = renderPixelFont(
          bundle[fontKey],
          text,
          currentAlignment,
          customFontScale
        );
      } else {
        fontHeightControls.style.display = "flex";
        fontScaleControls.style.display = "none";
        const fontStyle = fontSelect.value;
        const lines = text.split("\n");

        // Set the font to measure dimensions accurately
        offscreenCtx.font = `${fontHeight}px ${fontStyle}`;
        let maxTextWidth = 0;
        const lineMetrics = lines.map((line) => {
          const metrics = offscreenCtx.measureText(line);
          maxTextWidth = Math.max(maxTextWidth, metrics.width);
          return metrics.width;
        });

        const textHeight = fontHeight;
        const lineHeight = textHeight * 1.2; // A bit of extra space for line breaks
        const totalHeight = lines.length * lineHeight;
        const padding = 10;

        offscreenCanvas.width = Math.max(1, maxTextWidth + padding * 2);
        offscreenCanvas.height = Math.max(1, totalHeight + padding * 2);

        // Clear the offscreen canvas with a transparent background
        offscreenCtx.clearRect(
          0,
          0,
          offscreenCanvas.width,
          offscreenCanvas.height
        );

        // Draw the text line by line
        offscreenCtx.fillStyle = currentFontColor;
        offscreenCtx.font = `${fontHeight}px ${fontStyle}`;
        offscreenCtx.textBaseline = "top"; // Consistent text baseline

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lineWidth = lineMetrics[i];
          let xOffset = 0;
          let textAlign = "left";

          switch (currentAlignment) {
            case "center":
              xOffset = maxTextWidth / 2;
              textAlign = "center";
              break;
            case "right":
              xOffset = maxTextWidth;
              textAlign = "right";
              break;
            case "justify":
              xOffset = 0;
              textAlign = "left"; // Justify not directly supported, fallback
              break;
            default: // left
              xOffset = 0;
              textAlign = "left";
          }

          offscreenCtx.textAlign = textAlign;
          offscreenCtx.fillText(
            line,
            padding + xOffset,
            padding + i * lineHeight
          );
        }

        // Convert to selected color: apply color to non-transparent pixels
        const imageData = offscreenCtx.getImageData(
          0,
          0,
          offscreenCanvas.width,
          offscreenCanvas.height
        );
        const data = imageData.data;

        // Parse the hex color (handle both #RRGGBB and RRGGBB formats)
        let hex = currentFontColor.replace('#', '').toUpperCase();
        // Ensure it's 6 characters
        if (hex.length === 3) {
          // Expand shorthand #RGB to #RRGGBB
          hex = hex.split('').map(c => c + c).join('');
        }
        
        let r = 0, g = 0, b = 0;
        if (hex.length === 6) {
          r = parseInt(hex.substring(0, 2), 16);
          g = parseInt(hex.substring(2, 4), 16);
          b = parseInt(hex.substring(4, 6), 16);
        }

        for (let i = 0; i < data.length; i += 4) {
          // Check if the pixel is not fully transparent
          if (data[i + 3] > 0) {
            // If pixel has color (not white/transparent), apply selected color
            const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
            if (gray < 200) {
              data[i] = r;
              data[i + 1] = g;
              data[i + 2] = b;
              data[i + 3] = 255;
              pixelCount++;
            } else {
              data[i + 3] = 0;
            }
          }
        }
        offscreenCtx.putImageData(imageData, 0, 0);
      }

      // Update the pixel count display with color flash animation
      pixelCountText.textContent = `Pixel Count: ${pixelCount}`;
      pixelCountText.classList.remove("flash-red", "flash-green");

      // Force reflow to restart the animation
      void pixelCountText.offsetWidth;

      // --- NEW BEHAVIOR: flash red on increase, green on decrease ---
      if (pixelCount > lastPixelCount) {
        pixelCountText.classList.add("flash-red");
      } else if (pixelCount < lastPixelCount) {
        pixelCountText.classList.add("flash-green");
      }
      // -----------------------------------------------------------

      lastPixelCount = pixelCount;
    };

    // Function to draw the grid
    const drawGrid = () => {
      previewCtx.strokeStyle = "rgba(229, 229, 229, 0.5)";
      previewCtx.lineWidth = 1 / zoomLevel;
      previewCtx.beginPath();
      const offscreenW = offscreenCanvas.width;
      const offscreenH = offscreenCanvas.height;

      // Shift grid drawing by half a pixel to align with pixel corners
      for (let x = 0; x <= offscreenW; x += 1) {
        previewCtx.moveTo(x, 0);
        previewCtx.lineTo(x, offscreenH);
      }
      for (let y = 0; y <= offscreenH; y += 1) {
        previewCtx.moveTo(0, y);
        previewCtx.lineTo(offscreenW, y);
      }
      previewCtx.stroke();
    };

    // Function to render the visible canvas with pan and zoom
    const drawPreview = () => {
      const containerWidth = previewContainer.offsetWidth;
      const containerHeight = previewContainer.offsetHeight;

      previewCanvas.width = containerWidth;
      previewCanvas.height = containerHeight;

      // Set canvas background color
      previewCtx.fillStyle = "#f0f0f0";
      previewCtx.fillRect(0, 0, containerWidth, containerHeight);

      previewCtx.imageSmoothingEnabled = false; // Disable anti-aliasing

      // Apply transformations
      previewCtx.save();
      previewCtx.translate(panX, panY);
      previewCtx.scale(zoomLevel, zoomLevel);

      // Draw the offscreen canvas content onto the preview canvas
      previewCtx.drawImage(offscreenCanvas, 0, 0);

      // Draw the grid in the transformed space
      drawGrid();
      previewCtx.restore();
    };

    const handleWheel = (event) => {
      event.preventDefault(); // Prevent page scrolling
      hintText.classList.add("hidden");

      const oldZoom = zoomLevel;
      if (event.deltaY < 0) {
        zoomLevel = Math.min(zoomLevel + 1, maxZoom);
      } else {
        zoomLevel = Math.max(zoomLevel - 1, minZoom);
      }

      // Recalculate pan to keep the point under the cursor in the same location
      const containerRect = previewContainer.getBoundingClientRect();
      const mouseX = event.clientX - containerRect.left;
      const mouseY = event.clientY - containerRect.top;

      panX = mouseX - (mouseX - panX) * (oldZoom / zoomLevel);
      panY = mouseY - (mouseY - panY) * (oldZoom / zoomLevel);

      drawPreview();
    };

    const handleMouseDown = (event) => {
      isPanning = true;
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
      previewContainer.style.cursor = "grabbing";
      hintText.classList.add("hidden");
    };

    const handleMouseMove = (event) => {
      if (!isPanning) return;

      const dx = event.clientX - lastMouseX;
      const dy = event.clientY - lastMouseY;

      // Pan faithfully to mouse movement
      panX += dx;
      panY += dy;

      lastMouseX = event.clientX;
      lastMouseY = event.clientY;

      drawPreview();
    };

    const handleMouseUp = () => {
      isPanning = false;
      previewContainer.style.cursor = "grab";
    };

    const handleTouchStart = (event) => {
      if (event.touches.length === 1) {
        const touch = event.touches[0];
        isPanning = true;
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
      } else if (event.touches.length === 2) {
        lastDist = getDistance(event.touches[0], event.touches[1]);
      }
      hintText.classList.add("hidden");
    };

    const handleTouchMove = (event) => {
      event.preventDefault(); // Prevent scrolling
      if (event.touches.length === 1 && isPanning) {
        const touch = event.touches[0];
        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;

        // Pan faithfully to touch movement
        panX += dx;
        panY += dy;

        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        drawPreview();
      } else if (event.touches.length === 2 && lastDist !== null) {
        const dist = getDistance(event.touches[0], event.touches[1]);
        const oldZoom = zoomLevel;
        const sensitivity = 0.05;
        zoomLevel = Math.max(
          minZoom,
          Math.min(maxZoom, zoomLevel + (dist - lastDist) * sensitivity)
        );
        lastDist = dist;

        // Simple zoom centering
        const containerRect = previewContainer.getBoundingClientRect();
        const centerX =
          (event.touches[0].clientX + event.touches[1].clientX) / 2 -
          containerRect.left;
        const centerY =
          (event.touches[0].clientY + event.touches[1].clientY) / 2 -
          containerRect.top;

        panX = centerX - (centerX - panX) * (oldZoom / zoomLevel);
        panY = centerY - (centerY - panY) * (oldZoom / zoomLevel);
        drawPreview();
      }
    };

    const handleTouchEnd = () => {
      isPanning = false;
      lastDist = null;
    };

    const getDistance = (touch1, touch2) => {
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    // Function to download the canvas as a PNG
    const downloadImage = () => {
      if (textInput.value.trim() === "") {
        const messageBox = document.createElement("div");
        messageBox.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background-color: #333;
                    color: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    z-index: 1000;
                    text-align: center;
                `;
        messageBox.innerHTML = `<p>Please enter some text to generate an image.</p><button onclick="this.parentNode.remove()" style="margin-top: 10px; padding: 5px 10px; background-color: #555; color: white; border: none; border-radius: 4px;">OK</button>`;
        document.body.appendChild(messageBox);
        return;
      }

      // Use the offscreen canvas for download to ensure original quality
      const link = document.createElement("a");
      link.download = `pixel_font_${textInput.value.replace(
        /[^a-zA-Z0-9\n]/g,
        "_"
      )}.png`;
      link.href = offscreenCanvas.toDataURL("image/png");
      link.click();
    };

    // Event listener to handle font selection changes
    const handleFontChange = () => {
      if (isCustomFontSelected()) {
        fontHeightControls.style.display = "none";
        fontScaleControls.style.display = "flex";
      } else {
        fontHeightControls.style.display = "flex";
        fontScaleControls.style.display = "none";
      }
      renderOffscreenText();
      // Re-center on font change
      panX =
        previewContainer.offsetWidth / 2 -
        (offscreenCanvas.width * zoomLevel) / 2;
      panY =
        previewContainer.offsetHeight / 2 -
        (offscreenCanvas.height * zoomLevel) / 2;
      drawPreview();
    };

    fontSelect.addEventListener("change", handleFontChange);

    // Event listeners for font switching buttons
    prevFontBtn.addEventListener("click", () => {
      const options = Array.from(fontSelect.options);
      const currentIndex = options.findIndex(
        (option) => option.value === fontSelect.value
      );
      const newIndex = (currentIndex - 1 + options.length) % options.length;
      fontSelect.value = options[newIndex].value;
      handleFontChange();
    });

    nextFontBtn.addEventListener("click", () => {
      const options = Array.from(fontSelect.options);
      const currentIndex = options.findIndex(
        (option) => option.value === fontSelect.value
      );
      const newIndex = (currentIndex + 1) % options.length;
      fontSelect.value = options[newIndex].value;
      handleFontChange();
    });

    // Event listeners for alignment buttons
    alignmentControls.addEventListener("click", (event) => {
      const target = event.target.closest(".alignment-button");
      if (target) {
        // Remove active class from all buttons
        document
          .querySelectorAll(".alignment-button")
          .forEach((btn) => btn.classList.remove("active"));
        // Add active class to the clicked button
        target.classList.add("active");
        // Update alignment state based on button ID
        currentAlignment = target.id.replace("align-", "");
        renderOffscreenText();
        drawPreview();
      }
    });

    // Event listeners for user input
    textInput.addEventListener("input", () => {
      renderOffscreenText();
      drawPreview();
    });

    // Event listeners for font height controls
    decreaseSizeBtn.addEventListener("click", () => {
      if (fontHeight > 8) {
        fontHeight--;
        fontHeightDisplay.textContent = fontHeight;
        renderOffscreenText();
        drawPreview();
      }
    });

    increaseSizeBtn.addEventListener("click", () => {
      if (fontHeight < 128) {
        fontHeight++;
        fontHeightDisplay.textContent = fontHeight;
        renderOffscreenText();
        drawPreview();
      }
    });

    // Event listener for font scale range slider
    fontScaleRange.addEventListener("input", (event) => {
      customFontScale = parseInt(event.target.value);
      fontScaleDisplay.textContent = customFontScale;
      renderOffscreenText();
      drawPreview();
    });

    // Color picker event listeners
    const updateColor = (color) => {
      // Ensure color is in hex format
      if (!color.startsWith('#')) {
        color = '#' + color;
      }
      // Validate hex color
      if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
        currentFontColor = color.toUpperCase();
        fontColorPicker.value = currentFontColor;
        fontColorText.value = currentFontColor;
        renderOffscreenText();
        drawPreview();
      }
    };

    fontColorPicker.addEventListener("input", (event) => {
      updateColor(event.target.value);
    });

    fontColorText.addEventListener("input", (event) => {
      updateColor(event.target.value);
    });

    fontColorText.addEventListener("blur", (event) => {
      // Validate and fix color on blur
      let color = event.target.value.trim();
      if (!color.startsWith('#')) {
        color = '#' + color;
      }
      if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
        updateColor(color);
      } else {
        // Reset to current color if invalid
        event.target.value = currentFontColor;
      }
    });

    downloadBtn.addEventListener("click", downloadImage);

    // Panning event listeners
    previewContainer.addEventListener("mousedown", handleMouseDown);
    previewContainer.addEventListener("mousemove", handleMouseMove);
    previewContainer.addEventListener("mouseup", handleMouseUp);
    previewContainer.addEventListener("mouseleave", handleMouseUp);

    // Touch event listeners for mobile
    previewContainer.addEventListener("touchstart", handleTouchStart);
    previewContainer.addEventListener("touchmove", handleTouchMove);
    previewContainer.addEventListener("touchend", handleTouchEnd);

    // Zoom event listener
    previewContainer.addEventListener("wheel", handleWheel);

    // Responsive drawing on resize
    window.addEventListener("resize", () => {
      // Re-center the view on resize
      panX =
        previewContainer.offsetWidth / 2 -
        (offscreenCanvas.width * zoomLevel) / 2;
      panY =
        previewContainer.offsetHeight / 2 -
        (offscreenCanvas.height * zoomLevel) / 2;
      drawPreview();
    });

    // Initial setup and draw
    textInput.value = "Merhaba Dünya!\nHello World!";
    fontSelect.value = "custom-threeXFiveMinifont";
    // Initialize color picker
    currentFontColor = fontColorPicker.value;
    fontColorText.value = currentFontColor;
    renderOffscreenText();
    // Initial centering
    panX =
      previewContainer.offsetWidth / 2 -
      (offscreenCanvas.width * zoomLevel) / 2;
    panY =
      previewContainer.offsetHeight / 2 -
      (offscreenCanvas.height * zoomLevel) / 2;
    drawPreview();

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          downloadImage();
        }
      }
      if (e.key === 'ArrowLeft' && e.altKey) {
        e.preventDefault();
        prevFontBtn.click();
      }
      if (e.key === 'ArrowRight' && e.altKey) {
        e.preventDefault();
        nextFontBtn.click();
      }
    });
  }

  // Start initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded, but wait a bit for fonts_data.js to load
    setTimeout(init, 0);
  }
})();

