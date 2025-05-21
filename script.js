class ImageComparer {
	constructor({
		dropZoneId = "drop-zone",
		imageContainerId = "image-container",
		preview1Id = "preview1",
		preview2Id = "preview2",
		sliderId = "slider",
		label1Id = "label1",
		label2Id = "label2",
		resetBtnId = "reset-btn",
		statusTextId = "status-text",
	} = {}) {
		this.dropZone = document.getElementById(dropZoneId);
		this.imageContainer = document.getElementById(imageContainerId);
		this.preview1 = document.getElementById(preview1Id);
		this.preview2 = document.getElementById(preview2Id);
		this.slider = document.getElementById(sliderId);
		this.label1 = document.getElementById(label1Id);
		this.label2 = document.getElementById(label2Id);
		this.resetBtn = document.getElementById(resetBtnId);
		this.statusText = document.getElementById(statusTextId);

		this.scale = 1;
		this.offsetX = 0;
		this.offsetY = 0;
		this.animationFrameRequested = false;
		this.isPanning = false;
		this.isDraggingSlider = false;
		this.startX = 0;
		this.startY = 0;
		this.sliderX = window.innerWidth / 2;

		this.imageFiles = [];
		this.resizeTimeout = null;

		this._init();
	}

	_init() {
		this._addEventListeners();
	}

	_addEventListeners() {
		this.dropZone.addEventListener("dragover", (e) => {
			e.preventDefault();
			this.dropZone.classList.add("highlight");
		});

		this.dropZone.addEventListener("dragleave", () => {
			this.dropZone.classList.remove("highlight");
		});

		this.dropZone.addEventListener("drop", (e) => this._handleDrop(e));

		this.slider.addEventListener("mousedown", (e) => {
			e.stopPropagation();
			this.isDraggingSlider = true;
			this.imageContainer.style.cursor = "ew-resize";
		});

		document.addEventListener("mousedown", (e) => this._handleMouseDown(e));
		document.addEventListener("mousemove", (e) => this._handleMouseMove(e));
		document.addEventListener("mouseup", () => this._handleMouseUp());

		window.addEventListener("wheel", (e) => this._handleWheel(e), {
			passive: false,
		});

		window.addEventListener("resize", () => this._handleResize());

		window.addEventListener("resize", () => {
			clearTimeout(this.resizeTimeout);
			this.resizeTimeout = setTimeout(() => {
				this._handleResize();
			}, 200);
		});

		this.resetBtn.addEventListener("click", () => this._handleReset());
	}

	_handleResize() {
		if (!this.imageContainer.classList.contains("active")) return;
		this._handleReset();
	}

	_handleDrop(e) {
		e.preventDefault();
		this.dropZone.classList.remove("highlight");
		const files = [...e.dataTransfer.files].filter((f) =>
			f.type.startsWith("image/")
		);

		files.forEach((file) => {
			if (this.imageFiles.length >= 2) return;
			this.imageFiles.push(file);
			const index = this.imageFiles.length - 1;

			const reader = new FileReader();
			reader.onload = (ev) => {
				const img = document.createElement("img");
				img.src = ev.target.result;
				img.className = "zoomable";
				img.draggable = false;

				img.onload = () => {
					const viewW = window.innerWidth;
					const viewH = window.innerHeight;
					this.scale = viewH / img.naturalHeight;

					const scaledW = img.naturalWidth * this.scale;
					const scaledH = img.naturalHeight * this.scale;

					this.offsetX = (viewW - scaledW) / 2;
					this.offsetY = (viewH - scaledH) / 2;

					this._updateTransform(img);
				};

				if (index === 0) {
					this.preview1.innerHTML = "";
					this.preview1.appendChild(img);
					this.label1.textContent = file.name;
				} else if (index === 1) {
					this.preview2.innerHTML = "";
					this.preview2.appendChild(img);
					this.label2.textContent = file.name;
				}

				this._updateStatusText();
			};
			reader.readAsDataURL(file);
		});

		if (this.imageFiles.length === 2) {
			this.dropZone.classList.add("hidden");
			this.imageContainer.classList.add("active");
			this._setSliderPosition(window.innerWidth / 2);
			this._updateStatusText();
		}
	}

	_updateStatusText() {
		if (!this.statusText) return;
		if (this.imageFiles.length === 1) {
			this.statusText.textContent = "1 image added. Drop one more.";
		}
	}

	_updateTransform(img) {
		img.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
	}

	_updateAllTransforms() {
		document
			.querySelectorAll("img.zoomable")
			.forEach((img) => this._updateTransform(img));
	}

	_setSliderPosition(x) {
		this.sliderX = x;
		this.slider.style.left = `${x}px`;
		this.preview1.style.clipPath = `inset(0 ${
			window.innerWidth - x
		}px 0 0)`;
		this.preview2.style.clipPath = `inset(0 0 0 ${x}px)`;
	}

	_updateSliderAndClipPaths(x) {
		this.sliderX = x;
		this.slider.style.left = `${x}px`;
		this.preview1.style.clipPath = `inset(0 ${
			window.innerWidth - x
		}px 0 0)`;
		this.preview2.style.clipPath = `inset(0 0 0 ${x}px)`;
		this.animationFrameRequested = false;
	}

	_handleMouseDown(e) {
		if (
			!this.isDraggingSlider &&
			this.imageContainer.classList.contains("active")
		) {
			this.isPanning = true;
			this.startX = e.clientX;
			this.startY = e.clientY;
			this.imageContainer.style.cursor = "grabbing";
		}
	}

	_handleMouseMove(e) {
		if (this.isDraggingSlider) {
			if (!this.animationFrameRequested) {
				this.animationFrameRequested = true;
				requestAnimationFrame(() =>
					this._updateSliderAndClipPaths(e.clientX)
				);
			}
		} else if (this.isPanning) {
			this.imageContainer.style.cursor = "grabbing";
			const dx = e.clientX - this.startX;
			const dy = e.clientY - this.startY;
			this.offsetX += dx;
			this.offsetY += dy;
			this.startX = e.clientX;
			this.startY = e.clientY;
			this._updateAllTransforms();
		}
	}

	_handleMouseUp() {
		this.isDraggingSlider = false;
		this.isPanning = false;
		this.imageContainer.style.cursor = "grab";
	}

	_handleWheel(e) {
		if (!this.imageContainer.classList.contains("active")) return;
		e.preventDefault();

		const rect = this.imageContainer.getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;
		const prevScale = this.scale;

		const imgX = (mouseX - this.offsetX) / prevScale;
		const imgY = (mouseY - this.offsetY) / prevScale;

		this.scale = Math.max(0.1, prevScale + e.deltaY * -0.002);

		this.offsetX = mouseX - imgX * this.scale;
		this.offsetY = mouseY - imgY * this.scale;

		requestAnimationFrame(() => this._updateAllTransforms());
	}

	_handleReset() {
		const viewW = window.innerWidth;
		const viewH = window.innerHeight;

		document.querySelectorAll("img.zoomable").forEach((img) => {
			this.scale = viewH / img.naturalHeight;
			const scaledW = img.naturalWidth * this.scale;
			const scaledH = img.naturalHeight * this.scale;

			this.offsetX = (viewW - scaledW) / 2;
			this.offsetY = (viewH - scaledH) / 2;

			this._updateTransform(img);
		});

		this._setSliderPosition(viewW / 2);
	}
}

new ImageComparer();
