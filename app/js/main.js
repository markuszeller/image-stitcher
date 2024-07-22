const EVENTS = {
    CLICK: 'click',
    CHANGE: 'change',
    INPUT: 'input',
    DROP: 'drop',
    DRAGEND: 'dragend',
    DRAGLEAVE: 'dragleave',
    DRAGOVER: 'dragover',
    DRAGSTART: 'dragstart',
    TOUCHSTART: 'touchstart',
    TOUCHMOVE: 'touchmove',
    TOUCHEND: 'touchend'
};

const ATTRIBUTES = {
    DRAGGABLE: 'draggable',
    DATA_FILE: 'data-file',
    DATA_NAME: 'data-name',
    DATA_THEME: 'data-theme'
};

const SELECTORS = {
    MODE: 'input[name=mode]:checked',
    CANVAS: 'canvas'
};

const CSS_CLASSES = {
    DRAG_OVER: 'drag-over'
};

const CONSTANTS = {
    TRUE_TEXT: 'true',
    TABLE_ROW_TAG: 'tr',
    TABLE_DATA_TAG: 'td',
    IMAGE_MIME_TYPE_PATTERN: /^image\//,
    IMAGE_SYMBOL: '🎨',
    CANVAS_CONTEXT: '2d',
    HORIZONTAL_MODE: 'horizontal',
    MODAL_CLOSE_TIMEOUT_MS: 4000
};

const elements = {
    fileDrop: document.getElementById('files'),
    imagesList: document.getElementById('images-list'),
    clearButton: document.getElementById('clear-button'),
    stitchButton: document.getElementById('stitch-button'),
    saveButton: document.getElementById('save-button'),
    result: document.getElementById('result'),
    keepAspectCheckbox: document.getElementById('keep-aspect'),
    zoomSlider: document.getElementById('zoom-slider'),
    zoomValue: document.getElementById('zoom-value'),
    themeSelector: document.getElementById('theme-select'),
    dialog: document.getElementById('error-modal'),
    errorMessage: document.getElementById('error-modal').querySelector('.error-message')
};

const themes = [...elements.themeSelector.querySelectorAll('option')].map(option => option.value);

let dialogTimeout = 0;
let dragState = false;
let dragSource = null;

const showError = message => {
    elements.errorMessage.textContent = message;
    elements.dialog.showModal();
    dialogTimeout = window.setTimeout(() => elements.dialog.close(), CONSTANTS.MODAL_CLOSE_TIMEOUT_MS);
};

const getTouchTargetElement = e => document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);

const handleDragStart = (element, isDrag = true) => {
    element.classList.add(CSS_CLASSES.DRAG_OVER);
    elements.clearButton.classList.add(CSS_CLASSES.DRAG_OVER);
    dragState = true;
    dragSource = element;
    if (isDrag) element.classList.add(CSS_CLASSES.DRAG_OVER);
};

const handleDragEnd = element => {
    element.classList.remove(CSS_CLASSES.DRAG_OVER);
    elements.clearButton.classList.remove(CSS_CLASSES.DRAG_OVER);
    dragState = false;
    dragSource = null;
};

const handleElementMove = (targetElement, isDrag = false) => {
    if (!targetElement || targetElement.tagName !== CONSTANTS.TABLE_ROW_TAG) return;
    (dragSource.getBoundingClientRect().top > targetElement.getBoundingClientRect().top)
        ? targetElement.before(dragSource)
        : targetElement.after(dragSource);
    if (!isDrag) dragSource = null;
};

const addEventListeners = () => {
    elements.dialog.addEventListener(EVENTS.CLICK, () => {
        clearTimeout(dialogTimeout);
        dialogTimeout = 0;
        elements.dialog.close();
    });

    document.addEventListener(EVENTS.TOUCHSTART, e => {
        e.preventDefault();
        const targetElement = getTouchTargetElement(e);
        if (targetElement && targetElement.tagName === CONSTANTS.TABLE_ROW_TAG) {
            handleDragStart(targetElement, false);
        }
    });

    document.addEventListener(EVENTS.TOUCHMOVE, e => {
        e.preventDefault();
        if (dragState) handleElementMove(getTouchTargetElement(e));
    });

    document.addEventListener(EVENTS.TOUCHEND, () => {
        if (dragState) handleDragEnd(dragSource);
    });

    elements.saveButton.addEventListener(EVENTS.CLICK, () => {
        const canvas = elements.result.querySelector(SELECTORS.CANVAS);
        if (canvas) {
            const link = document.createElement('a');
            link.download = 'stitched-image.png';
            link.href = canvas.toDataURL();
            link.click();
        }
    });

    elements.zoomSlider.addEventListener(EVENTS.INPUT, () => {
        const zoomLevel = elements.zoomSlider.value;
        elements.zoomValue.textContent = `${zoomLevel}%`;
        const canvas = elements.result.querySelector(SELECTORS.CANVAS);
        canvas.style.width = `${canvas.width * zoomLevel / 100}px`;
        canvas.style.height = `${canvas.height * zoomLevel / 100}px`;
    });

    elements.themeSelector.addEventListener(EVENTS.CHANGE, () => {
        const value = elements.themeSelector.value;
        document.body.setAttribute(ATTRIBUTES.DATA_THEME, value);
        if (themes.includes(value)) {
            localStorage.setItem('theme', value);
        }
    });

    elements.fileDrop.addEventListener(EVENTS.DROP, handleFileDrop);
    elements.fileDrop.addEventListener(EVENTS.DRAGLEAVE, e => {
        e.preventDefault();
        elements.fileDrop.classList.remove(CSS_CLASSES.DRAG_OVER);
    });
    elements.fileDrop.addEventListener(EVENTS.DRAGOVER, e => {
        e.preventDefault();
        if (!dragState) elements.fileDrop.classList.add(CSS_CLASSES.DRAG_OVER);
    });

    elements.clearButton.addEventListener(EVENTS.CLICK, clearImages);
    elements.clearButton.addEventListener(EVENTS.DRAGOVER, e => e.preventDefault());
    elements.clearButton.addEventListener(EVENTS.DROP, () => {
        elements.clearButton.classList.remove(CSS_CLASSES.DRAG_OVER);
        if (dragSource) elements.imagesList.removeChild(dragSource);
    });

    elements.stitchButton.addEventListener(EVENTS.CLICK, stitchImages);
};

const handleFileDrop = e => {
    e.preventDefault();
    dragState = false;
    elements.fileDrop.classList.remove(CSS_CLASSES.DRAG_OVER);

    [...e.dataTransfer.files].forEach(file => {
        if (!file.type.match(CONSTANTS.IMAGE_MIME_TYPE_PATTERN)) {
            return showError(`Invalid file type. Only image files are allowed. File: ${file.name}`);
        }

        const tr = document.createElement(CONSTANTS.TABLE_ROW_TAG);
        const tdThumb = document.createElement(CONSTANTS.TABLE_DATA_TAG);
        const tdName = document.createElement(CONSTANTS.TABLE_DATA_TAG);

        tr.setAttribute(ATTRIBUTES.DRAGGABLE, CONSTANTS.TRUE_TEXT);
        tr.setAttribute(ATTRIBUTES.DATA_FILE, URL.createObjectURL(file));
        tr.setAttribute(ATTRIBUTES.DATA_NAME, file.name);

        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.className = 'thumbnail';
        tdThumb.appendChild(img);

        tdName.textContent = `${CONSTANTS.IMAGE_SYMBOL} ${file.name}`;
        tr.appendChild(tdThumb);
        tr.appendChild(tdName);

        tr.addEventListener(EVENTS.DRAGOVER, e => e.preventDefault());
        tr.addEventListener(EVENTS.DRAGSTART, () => handleDragStart(tr));
        tr.addEventListener(EVENTS.DRAGEND, () => handleDragEnd(tr));
        tr.addEventListener(EVENTS.DROP, () => handleElementMove(tr, true));
        tr.addEventListener(EVENTS.TOUCHSTART, () => handleDragStart(tr, false));
        tr.addEventListener(EVENTS.TOUCHEND, () => handleDragEnd(tr));
        tr.addEventListener(EVENTS.TOUCHMOVE, e => {
            e.preventDefault();
            if (dragState) handleElementMove(document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY));
        });

        elements.imagesList.appendChild(tr);
    });
};

const clearImages = () => {
    while (elements.imagesList.firstChild) {
        elements.imagesList.removeChild(elements.imagesList.firstChild);
    }
    const canvas = elements.result.querySelector(SELECTORS.CANVAS);
    if (canvas) elements.result.removeChild(canvas);
    elements.zoomSlider.value = 100;
    elements.zoomValue.textContent = '100%';
    elements.saveButton.disabled = true;
};

const stitchImages = e => {
    e.preventDefault();
    elements.zoomSlider.value = 100;
    elements.zoomValue.textContent = '100%';
    const canvas = elements.result.querySelector(SELECTORS.CANVAS);
    if (canvas) elements.result.removeChild(canvas);

    let minX = 0, maxX = 0, minY = 0, maxY = 0, sumX = 0, sumY = 0, loaded = 0;
    const bitmaps = [];

    const stitchImagesOnCanvas = () => {
        const isHorizontalMode = document.querySelector(SELECTORS.MODE).value === CONSTANTS.HORIZONTAL_MODE;
        const canvas = document.createElement(SELECTORS.CANVAS);
        canvas.width = isHorizontalMode ? sumX : maxX;
        canvas.style.maxWidth = isHorizontalMode ? '100%' : `${canvas.width}px`;
        canvas.height = isHorizontalMode ? maxY : sumY;
        canvas.style.maxHeight = isHorizontalMode ? `${canvas.height}px` : '50vh';

        const ctx = canvas.getContext(CONSTANTS.CANVAS_CONTEXT);
        let x = 0, y = 0;

        [...elements.imagesList.children].forEach(tr => {
            const bitmap = bitmaps[tr.dataset.bitmapIndex];
            const width = elements.keepAspectCheckbox.checked ? (isHorizontalMode ? bitmap.width : canvas.width) : bitmap.width;
            const height = elements.keepAspectCheckbox.checked ? (isHorizontalMode ? canvas.height : bitmap.height) : bitmap.height;

            ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, x, y, width, height);
            x += isHorizontalMode ? width : 0;
            y += isHorizontalMode ? 0 : height;
        });

        elements.result.appendChild(canvas);
        elements.saveButton.disabled = false;
    };

    [...elements.imagesList.children].forEach(tr => {
        const fileName = tr.dataset.name;
        fetch(tr.dataset.file)
            .then(response => response.blob())
            .then(createImageBitmap)
            .then(bitmap => {
                tr.dataset.bitmapIndex = bitmaps.push(bitmap) - 1;
                minX = Math.min(minX, bitmap.width);
                maxX = Math.max(maxX, bitmap.width);
                minY = Math.min(minY, bitmap.height);
                maxY = Math.max(maxY, bitmap.height);
                sumX += bitmap.width;
                sumY += bitmap.height;

                if (++loaded === elements.imagesList.children.length) {
                    stitchImagesOnCanvas();
                }
            })
            .catch(error => showError(`${error.message} File: ${fileName}`));
    });
};

elements.themeSelector.value = localStorage.getItem('theme') || themes[0];
elements.themeSelector.dispatchEvent(new Event(EVENTS.CHANGE));

addEventListeners();