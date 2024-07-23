const EventName = {
    click: 'click',
    change: 'change',
    input: 'input',
    drop: 'drop',
    dragEnd: 'dragend',
    dragLeave: 'dragleave',
    dragOver: 'dragover',
    dragStart: 'dragstart',
    touchStart: 'touchstart',
    touchMove: 'touchmove',
    touchEnd: 'touchend'
};

const Attribute = {
    draggable: 'draggable',
    dataFile: 'data-file',
    dataName: 'data-name',
    dataTheme: 'data-theme'
};

const Selector = {
    mode: 'input[name=mode]:checked',
    canvas: 'canvas'
};

const CssClass = {
    dragOver: 'drag-over',
    dragIndicator: 'drag-indicator'
};

const Text = {
    trueValue: 'true',
    tableRowTag: 'tr',
    tableDataTag: 'td',
    imageMimeTypePattern: /^image\//,
    imageSymbol: '🎨',
    canvasContext: '2d',
    horizontalMode: 'horizontal',
    modalCloseTimeout: 4000
};

const Element = {
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
    errorMessage: document.getElementById('error-modal').querySelector('.error-message'),
    menuTemplate: document.getElementById('image-menu-template')
};

const MenuAction = {
    rotateLeft: 'rotateLeft',
    rotateRight: 'rotateRight',
    resize: 'resize'
};


const themes = [...Element.themeSelector.querySelectorAll('option')].map(option => option.value);

let dialogTimeout = 0;
let dragState = false;
let dragSource = null;
let activeMenu = null;
let undoStack = new Map();

const showError = message => {
    Element.errorMessage.textContent = message;
    Element.dialog.showModal();
    dialogTimeout = window.setTimeout(() => Element.dialog.close(), Text.modalCloseTimeout);
};

const getTouchTargetElement = e => document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);

const handleDragStart = (element, isDrag = true) => {
    dragState = true;
    dragSource = element;
    if (isDrag) {
        element.classList.add(CssClass.dragOver);
        element.style.opacity = '0.5';  // Visual feedback
    }
};

const handleDragEnd = element => {
    element.classList.remove(CssClass.dragOver);
    element.style.opacity = 1;
    Element.clearButton.classList.remove(CssClass.dragOver);
    const indicator = Element.imagesList.querySelector('.' + CssClass.dragIndicator);
    if (indicator) {
        if (indicator !== element && indicator !== element.nextSibling) {
            Element.imagesList.insertBefore(element, indicator);
        }
        indicator.classList.remove(CssClass.dragIndicator);
    }
    dragState = false;
    dragSource = null;
};

const handleElementMove = (targetElement, isDrag = false) => {
    if (!targetElement || targetElement.tagName.toLowerCase() !== Text.tableRowTag || !dragSource) return;
    if (targetElement !== dragSource) {
        const rect = targetElement.getBoundingClientRect();
        const dragRect = dragSource.getBoundingClientRect();
        const next = (dragRect.top < rect.top + rect.height / 2) ? targetElement.nextElementSibling : targetElement;
        Element.imagesList.querySelectorAll('.' + CssClass.dragIndicator)
            .forEach(el => el.classList.remove(CssClass.dragIndicator));
        if (next !== dragSource && next !== dragSource.nextElementSibling) {
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
            const link = document.createElement('a');
            link.download = 'stitched-image.png';
            link.href = canvas.toDataURL();
            link.click();
        }
    });

    Element.zoomSlider.addEventListener(EventName.input, () => {
        const zoomLevel = Element.zoomSlider.value;
        Element.zoomValue.textContent = `${zoomLevel}%`;
        const canvas = Element.result.querySelector(Selector.canvas);
        canvas.style.width = `${canvas.width * zoomLevel / 100}px`;
        canvas.style.height = `${canvas.height * zoomLevel / 100}px`;
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

const rotateImage = (tr, direction) => {
    const img = tr.querySelector('img');
    const currentRotation = parseInt(img.dataset.rotation || '0');
    const newRotation = (currentRotation + (direction === 'left' ? -90 : 90) + 360) % 360;

    addToUndoStack(tr, { action: direction === 'left' ? MenuAction.rotateLeft : MenuAction.rotateRight, prevRotation: currentRotation });

    img.style.transform = `rotate(${newRotation}deg)`;
    img.dataset.rotation = newRotation;
};

const resizeImage = (tr, width, height) => {
    const img = tr.querySelector('img');
    const oldWidth = img.width;
    const oldHeight = img.height;

    addToUndoStack(tr, { action: MenuAction.resize, prevWidth: oldWidth, prevHeight: oldHeight });

    img.width = width;
    img.height = height;
};

const addToUndoStack = (tr, action) => {
    if (!undoStack.has(tr)) {
        undoStack.set(tr, []);
    }
    undoStack.get(tr).push(action);
};

const undo = (tr) => {
    const actions = undoStack.get(tr);
    if (actions && actions.length > 0) {
        const lastAction = actions.pop();
        const img = tr.querySelector('img');

        switch (lastAction.action) {
            case MenuAction.rotateLeft:
            case MenuAction.rotateRight:
                img.style.transform = `rotate(${lastAction.prevRotation}deg)`;
                img.dataset.rotation = lastAction.prevRotation;
                break;
            case MenuAction.resize:
                img.width = lastAction.prevWidth;
                img.height = lastAction.prevHeight;
                break;
        }
    }
};

const showImageMenu = (event, tr) => {
    if (activeMenu) {
        activeMenu.remove();
    }

    const menu = Element.menuTemplate.content.cloneNode(true).firstElementChild;
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;

    menu.querySelector('.rotate-left').addEventListener('click', () => rotateImage(tr, 'left'));
    menu.querySelector('.rotate-right').addEventListener('click', () => rotateImage(tr, 'right'));
    menu.querySelector('.apply-resize').addEventListener('click', () => {
        const width = parseInt(menu.querySelector('.resize-width').value);
        const height = parseInt(menu.querySelector('.resize-height').value);
        if (width && height) {
            resizeImage(tr, width, height);
        }
    });
    menu.querySelector('.undo').addEventListener('click', () => undo(tr));

    document.body.appendChild(menu);
    activeMenu = menu;

    document.addEventListener('click', closeMenu);
};

const closeMenu = (event) => {
    if (activeMenu && !activeMenu.contains(event.target)) {
        activeMenu.remove();
        activeMenu = null;
        document.removeEventListener('click', closeMenu);
    }
};

const handleFileDrop = e => {
    e.preventDefault();
    dragState = false;
    Element.fileDrop.classList.remove(CssClass.dragOver);

    [...e.dataTransfer.files].forEach(file => {
        if (!file.type.match(Text.imageMimeTypePattern)) {
            return showError(`Invalid file type. Only image files are allowed. File: ${file.name}`);
        }

        const tr = document.createElement(Text.tableRowTag);
        const tdThumb = document.createElement(Text.tableDataTag);
        const tdName = document.createElement(Text.tableDataTag);

        tr.setAttribute(Attribute.draggable, Text.trueValue);
        tr.setAttribute(Attribute.dataFile, URL.createObjectURL(file));
        tr.setAttribute(Attribute.dataName, file.name);

        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.className = 'thumbnail';
        tdThumb.appendChild(img);

        tdName.textContent = `${Text.imageSymbol} ${file.name}`;
        tr.appendChild(tdThumb);
        tr.appendChild(tdName);

        tr.appendChild(tdThumb);
        tr.appendChild(tdName);

        tr.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            showImageMenu(event, tr);
        });

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
    Element.zoomSlider.value = 100;
    Element.zoomValue.textContent = '100%';
    Element.saveButton.disabled = true;
};

const stitchImages = e => {
    e.preventDefault();
    Element.zoomSlider.value = 100;
    Element.zoomValue.textContent = '100%';
    const existingCanvas = Element.result.querySelector(Selector.canvas);
    if (existingCanvas) Element.result.removeChild(existingCanvas);

    let minX = 0, maxX = 0, minY = 0, maxY = 0, sumX = 0, sumY = 0, loaded = 0;
    const bitmaps = [];
    const imageElements = [...Element.imagesList.children];

    const loadPromises = imageElements.map((tr, index) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const rotation = parseInt(tr.querySelector('img').dataset.rotation || '0');
                const width = tr.querySelector('img').width || img.width;
                const height = tr.querySelector('img').height || img.height;

                let effectiveWidth, effectiveHeight;
                if (rotation % 180 === 0) {
                    effectiveWidth = width;
                    effectiveHeight = height;
                } else {
                    effectiveWidth = height;
                    effectiveHeight = width;
                }

                minX = Math.min(minX, effectiveWidth);
                maxX = Math.max(maxX, effectiveWidth);
                minY = Math.min(minY, effectiveHeight);
                maxY = Math.max(maxY, effectiveHeight);
                sumX += effectiveWidth;
                sumY += effectiveHeight;

                createImageBitmap(img).then(bitmap => {
                    bitmaps[index] = bitmap;
                    loaded++;
                    resolve();
                });
            };
            img.onerror = reject;
            img.src = tr.getAttribute(Attribute.dataFile);
        });
    });

    Promise.all(loadPromises).then(() => {
        const isHorizontalMode = document.querySelector(Selector.mode).value === Text.horizontalMode;
        const keepAspect = Element.keepAspectCheckbox.checked;

        const canvas = document.createElement(Selector.canvas);
        canvas.width = isHorizontalMode ? sumX : maxX;
        canvas.height = isHorizontalMode ? maxY : sumY;

        if (keepAspect) {
            const aspectRatio = canvas.width / canvas.height;
            const maxWidth = window.innerWidth * 0.9;
            const maxHeight = window.innerHeight * 0.9;
            if (canvas.width > maxWidth || canvas.height > maxHeight) {
                if (maxWidth / aspectRatio <= maxHeight) {
                    canvas.style.width = maxWidth + 'px';
                    canvas.style.height = (maxWidth / aspectRatio) + 'px';
                } else {
                    canvas.style.height = maxHeight + 'px';
                    canvas.style.width = (maxHeight * aspectRatio) + 'px';
                }
            } else {
                canvas.style.width = canvas.width + 'px';
                canvas.style.height = canvas.height + 'px';
            }
        } else {
            canvas.style.maxWidth = '100%';
            canvas.style.maxHeight = '50vh';
        }

        const ctx = canvas.getContext(Text.canvasContext);
        let x = 0, y = 0;

        imageElements.forEach((tr, index) => {
            const bitmap = bitmaps[index];
            const img = tr.querySelector('img');
            const rotation = parseInt(img.dataset.rotation || '0');
            const width = img.width || bitmap.width;
            const height = img.height || bitmap.height;

            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');

            if (rotation % 180 === 0) {
                tempCanvas.width = width;
                tempCanvas.height = height;
            } else {
                tempCanvas.width = height;
                tempCanvas.height = width;
            }

            tempCtx.save();
            tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
            tempCtx.rotate((rotation * Math.PI) / 180);
            tempCtx.drawImage(bitmap, -width / 2, -height / 2, width, height);
            tempCtx.restore();

            ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, x, y, tempCanvas.width, tempCanvas.height);

            if (isHorizontalMode) {
                x += tempCanvas.width;
            } else {
                y += tempCanvas.height;
            }
        });

        Element.result.appendChild(canvas);
        Element.saveButton.disabled = false;

        bitmaps.forEach(bitmap => bitmap.close());
    }).catch(error => {
        showError(`Error stitching images: ${error.message}`);
    });
};

Element.themeSelector.value = localStorage.getItem('theme') || themes[0];
Element.themeSelector.dispatchEvent(new Event(EventName.change));

addEventListeners();
