const EventName = {
    click     : 'click',
    change    : 'change',
    input     : 'input',
    drop      : 'drop',
    dragEnd   : 'dragend',
    dragLeave : 'dragleave',
    dragOver  : 'dragover',
    dragStart : 'dragstart',
    touchStart: 'touchstart',
    touchMove : 'touchmove',
    touchEnd  : 'touchend'
};

const Attribute = {
    draggable: 'draggable',
    dataFile : 'data-file',
    dataName : 'data-name',
    dataTheme: 'data-theme'
};

const Selector = {
    mode  : 'input[name=mode]:checked',
    canvas: 'canvas'
};

const CssClass = {
    dragOver: 'drag-over',
    dragIndicator: 'drag-indicator'
};

const MagicValues = {
    opacityDragging: 0.5,
    opacityDefault: 1,
    zoomDefault: 100,
    canvasMaxHeight: '50vh',
    canvasContext: '2d',
    modalCloseTimeout: 4000
};

const Text = {
    trueValue           : 'true',
    tableRowTag         : 'tr',
    tableDataTag        : 'td',
    imageMimeTypePattern: /^image\//,
    imageSymbol         : '🎨',
    horizontalMode      : 'horizontal'
};

const Element = {
    fileDrop          : document.getElementById('files'),
    imagesList        : document.getElementById('images-list'),
    clearButton       : document.getElementById('clear-button'),
    stitchButton      : document.getElementById('stitch-button'),
    saveButton        : document.getElementById('save-button'),
    result            : document.getElementById('result'),
    keepAspectCheckbox: document.getElementById('keep-aspect'),
    zoomSlider        : document.getElementById('zoom-slider'),
    zoomValue         : document.getElementById('zoom-value'),
    themeSelector     : document.getElementById('theme-select'),
    dialog            : document.getElementById('error-modal'),
    errorMessage      : document.getElementById('error-modal').querySelector('.error-message')
};

const themes = [...Element.themeSelector.querySelectorAll('option')].map(option => option.value);

let dialogTimeout = 0;
let dragState     = false;
let dragSource    = null;

const showError = message => {
    Element.errorMessage.textContent = message;
    Element.dialog.showModal();
    dialogTimeout = window.setTimeout(() => Element.dialog.close(), MagicValues.modalCloseTimeout);
};

const getTouchTargetElement = e => document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);

const handleDragStart = (element, isDrag = true) => {
    dragState  = true;
    dragSource = element;
    if (isDrag) {
        element.classList.add(CssClass.dragOver);
        element.style.opacity = MagicValues.opacityDragging;
    }
};

const handleDragEnd = element => {
    element.classList.remove(CssClass.dragOver);
    element.style.opacity = MagicValues.opacityDefault;
    Element.clearButton.classList.remove(CssClass.dragOver);
    const indicator = Element.imagesList.querySelector('.' + CssClass.dragIndicator);
    if (indicator) {
        if (indicator !== element && indicator !== element.nextSibling) {
            Element.imagesList.insertBefore(element, indicator);
        }
        indicator.classList.remove(CssClass.dragIndicator);
    }
    dragState  = false;
    dragSource = null;
};

const handleElementMove = (targetElement, isDrag = false) => {
    if (!targetElement || targetElement.tagName.toLowerCase() !== Text.tableRowTag || !dragSource) return;
    if (targetElement !== dragSource) {
        const rect = targetElement.getBoundingClientRect();
        const dragRect = dragSource.getBoundingClientRect();
        const isAboveHalf = dragRect.top < rect.top + rect.height / 2;
        const next = isAboveHalf ? targetElement.nextElementSibling : targetElement;

        Element.imagesList.querySelectorAll('.' + CssClass.dragIndicator)
            .forEach(el => el.classList.remove(CssClass.dragIndicator));

        const isNotDragSource = next !== dragSource;
        const isNotNextSibling = next !== dragSource.nextElementSibling;

        if (isNotDragSource && isNotNextSibling) {
            if (next) {
                next.classList.add(CssClass.dragIndicator);
            } else {
                Element.imagesList.lastElementChild.classList.add(CssClass.dragIndicator);
            }
        }
    }
};

const addEventListeners = () => {
    Element.dialog.addEventListener(EventName.click, () => {
        clearTimeout(dialogTimeout);
        dialogTimeout = 0;
        Element.dialog.close();
    });

    document.addEventListener(EventName.touchStart, e => {
        const targetElement = getTouchTargetElement(e);
        if (targetElement && targetElement.tagName === Text.tableRowTag) {
            e.preventDefault();
            handleDragStart(targetElement, false);
        }
    });

    document.addEventListener(EventName.touchMove, e => {
        if (dragState) {
            e.preventDefault();
            handleElementMove(getTouchTargetElement(e));
        }
    });

    document.addEventListener(EventName.touchEnd, e => {
        if (dragState) {
            e.preventDefault();
            handleDragEnd(dragSource);
        }
    });

    Element.saveButton.addEventListener(EventName.click, () => {
        const canvas = Element.result.querySelector(Selector.canvas);
        if (canvas) {
            const link    = document.createElement('a');
            link.download = 'stitched-image.png';
            link.href     = canvas.toDataURL();
            link.click();
        }
    });

    Element.zoomSlider.addEventListener(EventName.input, () => {
        const zoomLevel               = Element.zoomSlider.value;
        Element.zoomValue.textContent = `${zoomLevel}%`;
        const canvas                  = Element.result.querySelector(Selector.canvas);
        canvas.style.width            = `${canvas.width * zoomLevel / 100}px`;
        canvas.style.height           = `${canvas.height * zoomLevel / 100}px`;
    });

    Element.themeSelector.addEventListener(EventName.change, () => {
        const value = Element.themeSelector.value;
        document.body.setAttribute(Attribute.dataTheme, value);
        if (themes.includes(value)) {
            localStorage.setItem('theme', value);
        }
    });

    Element.fileDrop.addEventListener(EventName.drop, handleFileDrop);
    Element.fileDrop.addEventListener(EventName.dragLeave, e => {
        e.preventDefault();
        Element.fileDrop.classList.remove(CssClass.dragOver);
    });
    Element.fileDrop.addEventListener(EventName.dragOver, e => {
        e.preventDefault();
        if (!dragState) Element.fileDrop.classList.add(CssClass.dragOver);
    });

    Element.clearButton.addEventListener(EventName.click, clearImages);
    Element.clearButton.addEventListener(EventName.dragOver, e => e.preventDefault());
    Element.clearButton.addEventListener(EventName.drop, () => {
        Element.clearButton.classList.remove(CssClass.dragOver);
        if (dragSource) Element.imagesList.removeChild(dragSource);
    });

    Element.stitchButton.addEventListener(EventName.click, stitchImages);
};

const handleFileDrop = e => {
    e.preventDefault();
    dragState = false;
    Element.fileDrop.classList.remove(CssClass.dragOver);

    [...e.dataTransfer.files].forEach(file => {
        if (!file.type.match(Text.imageMimeTypePattern)) {
            return showError(`Invalid file type. Only image files are allowed. File: ${file.name}`);
        }

        const tr      = document.createElement(Text.tableRowTag);
        const tdThumb = document.createElement(Text.tableDataTag);
        const tdName  = document.createElement(Text.tableDataTag);

        tr.setAttribute(Attribute.draggable, Text.trueValue);
        tr.setAttribute(Attribute.dataFile, URL.createObjectURL(file));
        tr.setAttribute(Attribute.dataName, file.name);

        const img     = document.createElement('img');
        img.src       = URL.createObjectURL(file);
        img.className = 'thumbnail';
        tdThumb.appendChild(img);

        tdName.textContent = `${Text.imageSymbol} ${file.name}`;
        tr.appendChild(tdThumb);
        tr.appendChild(tdName);

        tr.addEventListener(EventName.dragOver, (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleElementMove(tr, true);
        });
        tr.addEventListener(EventName.dragStart, (e) => {
            e.dataTransfer.setData('text/plain', '');
            handleDragStart(tr);
        });
        tr.addEventListener(EventName.dragEnd, () => handleDragEnd(tr));
        tr.addEventListener(EventName.drop, () => handleElementMove(tr, true));
        tr.addEventListener(EventName.touchStart, (e) => {
            e.preventDefault();
            handleDragStart(tr, false);
        });
        tr.addEventListener(EventName.touchEnd, (e) => {
            e.preventDefault();
            handleDragEnd(tr);
        });
        tr.addEventListener(EventName.touchMove, e => {
            e.preventDefault();
            if (dragState) {
                const touchLocation = e.targetTouches[0];
                const targetElement = document.elementFromPoint(touchLocation.clientX, touchLocation.clientY);
                handleElementMove(targetElement);
            }
        });
        Element.imagesList.appendChild(tr);
    });
};

const clearImages = () => {
    while (Element.imagesList.firstChild) {
        Element.imagesList.removeChild(Element.imagesList.firstChild);
    }
    const canvas = Element.result.querySelector(Selector.canvas);
    if (canvas) Element.result.removeChild(canvas);
    Element.zoomSlider.value      = MagicValues.zoomDefault;
    Element.zoomValue.textContent = `${MagicValues.zoomDefault}%`;
    Element.saveButton.disabled   = true;
};

const stitchImages = e => {
    e.preventDefault();
    Element.zoomSlider.value      = MagicValues.zoomDefault;
    Element.zoomValue.textContent = `${MagicValues.zoomDefault}%`;
    const canvas                  = Element.result.querySelector(Selector.canvas);
    if (canvas) Element.result.removeChild(canvas);

    let minX      = 0, maxX = 0, minY = 0, maxY = 0, sumX = 0, sumY = 0, loaded = 0;
    const bitmaps = [];

    const stitchImagesOnCanvas = () => {
        const isHorizontalMode = document.querySelector(Selector.mode).value === Text.horizontalMode;
        const canvas           = document.createElement(Selector.canvas);
        canvas.width           = isHorizontalMode ? sumX : maxX;
        canvas.style.maxWidth  = isHorizontalMode ? '100%' : `${canvas.width}px`;
        canvas.height          = isHorizontalMode ? maxY : sumY;
        canvas.style.maxHeight = isHorizontalMode ? `${canvas.height}px` : MagicValues.canvasMaxHeight;

        const ctx = canvas.getContext(MagicValues.canvasContext);
        let x     = 0, y = 0;

        [...Element.imagesList.children].forEach(tr => {
            const bitmap = bitmaps[tr.dataset.bitmapIndex];
            const width  = Element.keepAspectCheckbox.checked ? (isHorizontalMode ? bitmap.width : canvas.width) : bitmap.width;
            const height = Element.keepAspectCheckbox.checked ? (isHorizontalMode ? canvas.height : bitmap.height) : bitmap.height;

            ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, x, y, width, height);
            x += isHorizontalMode ? width : 0;
            y += isHorizontalMode ? 0 : height;
        });

        Element.result.appendChild(canvas);
        Element.saveButton.disabled = false;
    };

    [...Element.imagesList.children].forEach(tr => {
        const fileName = tr.dataset.name;
        fetch(tr.dataset.file)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Network error (${response.status}): ${response.statusText}`);
                }
                return response.blob();
            })
            .then(blob => {
                if (!blob.type.match(Text.imageMimeTypePattern)) {
                    throw new Error('No valid image file');
                }
                return createImageBitmap(blob);
            })
            .then(bitmap => {
                tr.dataset.bitmapIndex = bitmaps.push(bitmap) - 1;
                minX = Math.min(minX, bitmap.width);
                maxX = Math.max(maxX, bitmap.width);
                minY = Math.min(minY, bitmap.height);
                maxY = Math.max(maxY, bitmap.height);
                sumX += bitmap.width;
                sumY += bitmap.height;
                if (++loaded === Element.imagesList.children.length) {
                    stitchImagesOnCanvas();
                }
            })
            .catch(error => showError(`[${fileName}] ${error.message}`));
    });
};

Element.themeSelector.value = localStorage.getItem('theme') || themes[0];
Element.themeSelector.dispatchEvent(new Event(EventName.change));

addEventListeners();
