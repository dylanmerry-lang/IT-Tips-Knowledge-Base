// IT Tips & Tricks Tracker - Frontend JavaScript

class TipsTracker {
    constructor() {
        this.tips = [];
        this.filteredTips = [];
        this.currentTip = null;
        this.isEditing = false;

        this.initializeElements();
        this.attachEventListeners();
        this.loadTips();
    }

    initializeElements() {
        // Main elements
        this.tipsContainer = document.getElementById('tipsContainer');
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');

        // Search and filter
        this.searchInput = document.getElementById('searchInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.categoryFilter = document.getElementById('categoryFilter');

        // Modals
        this.tipModal = document.getElementById('tipModal');
        this.editModal = document.getElementById('editModal');
        this.deleteModal = document.getElementById('deleteModal');

        // Modal content
        this.modalTitle = document.getElementById('modalTitle');
        this.modalCategory = document.getElementById('modalCategory');
        this.modalDate = document.getElementById('modalDate');
        this.modalProblem = document.getElementById('modalProblem');
        this.modalAnswer = document.getElementById('modalAnswer');

        // Form elements
        this.editModalTitle = document.getElementById('editModalTitle');
        this.tipForm = document.getElementById('tipForm');
        this.tipTitle = document.getElementById('tipTitle');
        this.tipCategory = document.getElementById('tipCategory');
        this.tipProblem = document.getElementById('tipProblem');
        this.tipAnswer = document.getElementById('tipAnswer');
        this.tipLocation = document.getElementById('tipLocation');
        this.tipAdditionalDetails = document.getElementById('tipAdditionalDetails');
        this.tipAttachments = document.getElementById('tipAttachments');
        this.filePreview = document.getElementById('filePreview');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.addTipBtn = document.getElementById('addTipBtn');

        // File handling
        this.selectedFiles = [];

        // Delete modal elements
        this.cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
        this.confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

        // Settings modal elements
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.settingsTabs = document.querySelectorAll('.settings-tab');
        this.settingsTabContents = document.querySelectorAll('.settings-tab-content');

        // Audit log elements
        this.auditFilter = document.getElementById('auditFilter');
        this.auditAuthorFilter = document.getElementById('auditAuthorFilter');
        this.refreshAuditBtn = document.getElementById('refreshAuditBtn');
        this.auditLogContainer = document.getElementById('auditLogContainer');
        this.auditPrevBtn = document.getElementById('auditPrevBtn');
        this.auditNextBtn = document.getElementById('auditNextBtn');
        this.auditPageInfo = document.getElementById('auditPageInfo');

        // Stats elements
        this.statsContainer = document.getElementById('statsContainer');

        // Comments elements
        this.commentsContainer = document.getElementById('commentsContainer');
        this.commentForm = document.getElementById('commentForm');
        this.commentContent = document.getElementById('commentContent');
        this.parentCommentId = document.getElementById('parentCommentId');
        this.cancelReplyBtn = document.getElementById('cancelReplyBtn');

        // Dark mode toggle
        this.darkModeToggle = document.getElementById('darkModeToggle');

        // Audit pagination
        this.auditCurrentPage = 0;
        this.auditPageSize = 20;

        // Initialize theme
        this.initializeTheme();
    }

    attachEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Press '/' to focus search
            if (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                this.searchInput.focus();
                this.searchInput.select();
            }
            // Escape to blur search
            if (e.key === 'Escape' && e.target === this.searchInput) {
                this.searchInput.blur();
            }
        });

        // Search and filter
        this.searchInput.addEventListener('input', () => this.filterTips());
        this.categoryFilter.addEventListener('change', () => this.filterTips());

        // Modal controls
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => this.closeModals());
        });

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target === this.tipModal || e.target === this.editModal || e.target === this.deleteModal || e.target === this.settingsModal) {
                this.closeModals();
            }
        });

        // Form handling
        this.tipForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        this.cancelBtn.addEventListener('click', () => this.closeModals());
        this.addTipBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.openAddModal();
        });

        // Delete modal handling
        this.cancelDeleteBtn.addEventListener('click', () => this.closeDeleteModal());
        this.confirmDeleteBtn.addEventListener('click', () => this.confirmDelete());

        // File upload handling
        this.tipAttachments.addEventListener('change', (e) => this.handleFileSelection(e));

        // Settings modal handling
        this.settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.openSettingsModal();
        });
        this.settingsTabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.switchSettingsTab(e.target.dataset.tab));
        });

        // Audit log handling
        this.auditFilter.addEventListener('change', () => this.loadAuditLogs());
        this.auditAuthorFilter.addEventListener('input', () => this.loadAuditLogs());
        this.refreshAuditBtn.addEventListener('click', () => this.loadAuditLogs());
        this.auditPrevBtn.addEventListener('click', () => this.loadAuditLogs(this.auditCurrentPage - 1));
        this.auditNextBtn.addEventListener('click', () => this.loadAuditLogs(this.auditCurrentPage + 1));

        // Comment handling
        this.commentForm.addEventListener('submit', (e) => this.handleCommentSubmit(e));
        this.cancelReplyBtn.addEventListener('click', () => this.cancelReply());

        // Settings modal handling
        this.settingsBtn.addEventListener('click', () => this.openSettingsModal());
        this.settingsTabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.switchSettingsTab(e.target.dataset.tab));
        });

        // Dark mode toggle
        this.darkModeToggle.addEventListener('change', (e) => this.toggleDarkMode(e.target.checked));
    }

    async loadTips() {
        try {
            this.showLoading();
            const response = await fetch('/api/tips');

            if (!response.ok) {
                throw new Error('Failed to load tips');
            }

            this.tips = await response.json();
            this.filteredTips = [...this.tips];
            this.renderTips();
            this.hideLoading();
            this.error.style.display = 'none';
        } catch (error) {
            this.showError('Failed to load tips. Please try again later.');
            console.error('Error loading tips:', error);
        }
    }

    filterTips() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const categoryFilter = this.categoryFilter.value;

        this.filteredTips = this.tips.filter(tip => {
            const matchesSearch = tip.title.toLowerCase().includes(searchTerm) ||
                                tip.problem.toLowerCase().includes(searchTerm) ||
                                (tip.solution || tip.chatgpt_answer || '').toLowerCase().includes(searchTerm) ||
                                (tip.location || '').toLowerCase().includes(searchTerm) ||
                                (tip.additional_details || '').toLowerCase().includes(searchTerm);

            const matchesCategory = !categoryFilter || tip.category === categoryFilter;

            return matchesSearch && matchesCategory;
        });

        this.renderTips();
    }

    renderTips() {
        if (this.filteredTips.length === 0) {
            this.tipsContainer.innerHTML = '<li class="carousel__item"><p class="no-tips">No tips found matching your criteria.</p></li>';
            return;
        }

        this.tipsContainer.innerHTML = this.filteredTips.map(tip => `
            <li class="carousel__item">
                <div class="tip-card" data-tip-id="${tip.id}">
                    <div class="tip-content">
                        <h3 class="tip-title">${this.escapeHtml(tip.title)}</h3>
                        <span class="tip-category">${this.escapeHtml(tip.category)}</span>
                        <p class="tip-preview">${this.escapeHtml(tip.problem.substring(0, 150))}...</p>
                        <div class="tip-date">${this.formatDate(tip.created_at)}</div>
                    </div>
                    <div class="tip-actions">
                        <button class="btn-edit" data-tip-id="${tip.id}" data-action="edit" aria-label="Edit tip">✏️</button>
                        <button class="btn-delete" data-tip-id="${tip.id}" data-action="delete" aria-label="Delete tip">🗑️</button>
                    </div>
                </div>
            </li>
        `).join('');

        // Add click listeners to tip cards and action buttons
        document.querySelectorAll('.tip-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't open modal if clicking on action buttons
                if (e.target.closest('.tip-actions')) {
                    return;
                }
                const tipId = parseInt(card.dataset.tipId);
                this.openTipModal(tipId);
            });
        });

        // Add event listeners for action buttons
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const tipId = parseInt(btn.dataset.tipId);
                this.openEditModal(tipId);
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const tipId = parseInt(btn.dataset.tipId);
                this.openDeleteModal(tipId);
            });
        });

        // Ensure carousel controls are bound (scroll-based)
        const carouselEl = document.getElementById('tipsCarousel');
        if (carouselEl && !carouselEl.dataset.controlsBound) {
            const prevBtn = carouselEl.querySelector('.carousel__control--prev');
            const nextBtn = carouselEl.querySelector('.carousel__control--next');
            const wrapper = carouselEl.querySelector('.carousel__wrapper');
            if (prevBtn && nextBtn) {
                prevBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (wrapper) {
                        this.scrollCarousel(wrapper, -1);
                    }
                });
                nextBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (wrapper) {
                        this.scrollCarousel(wrapper, 1);
                    }
                });
                prevBtn.removeAttribute('disabled');
                nextBtn.removeAttribute('disabled');
                carouselEl.dataset.controlsBound = 'true';
            }
        }

        // Enable mouse wheel scrolling for carousel
        if (carouselEl && !carouselEl.dataset.wheelBound) {
            const wrapper = carouselEl.querySelector('.carousel__wrapper');
            if (wrapper) {
                wrapper.addEventListener('wheel', (e) => {
                    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
                    if (delta !== 0) {
                        e.preventDefault();
                        wrapper.scrollBy({ left: delta * 6, behavior: 'smooth' });
                    }
                }, { passive: false });
                carouselEl.dataset.wheelBound = 'true';
            }
        }
    }

    scrollCarousel(wrapper, direction) {
        const item = wrapper.querySelector('.carousel__item');
        if (!item) return;
        const itemStyle = window.getComputedStyle(item);
        const itemWidth = parseFloat(itemStyle.getPropertyValue('width')) || 0;
        const itemMargin = parseFloat(itemStyle.getPropertyValue('margin-right')) || 0;
        const step = itemWidth + itemMargin;
        wrapper.scrollBy({ left: direction * step, behavior: 'smooth' });
    }

    openTipModal(tipId) {
        const tip = this.tips.find(t => t.id === tipId);
        if (!tip) return;

        this.currentTip = tip;
        this.modalTitle.textContent = tip.title;
        this.modalCategory.textContent = tip.category;
        this.modalDate.textContent = this.formatDate(tip.created_at);
        this.modalProblem.textContent = tip.problem;
        this.modalAnswer.textContent = tip.solution || tip.chatgpt_answer;

        // Add location and additional details sections if they exist
        this.updateModalSections(tip);

        // Load and display attachments
        this.loadAttachments(tip.id);

        // Load and display comments
        this.loadComments(tip.id);

        // Add action buttons to modal
        const existingActions = this.tipModal.querySelector('.modal-actions');
        if (existingActions) {
            existingActions.remove();
        }

        const modalActions = document.createElement('div');
        modalActions.className = 'modal-actions';
        modalActions.innerHTML = `
            <button class="btn-edit" data-tip-id="${tip.id}" aria-label="Edit tip" title="Edit tip">✏️</button>
            <button class="btn-delete" data-tip-id="${tip.id}" aria-label="Delete tip" title="Delete tip">🗑️</button>
        `;

        // Add event listeners to modal action buttons
        modalActions.querySelector('.btn-edit').addEventListener('click', () => {
            this.closeModals();
            this.openEditModal(tip.id);
        });

        modalActions.querySelector('.btn-delete').addEventListener('click', () => {
            this.closeModals();
            this.openDeleteModal(tip.id);
        });

        this.tipModal.querySelector('.modal-content').appendChild(modalActions);

        this.tipModal.style.display = 'flex';
    }

    openAddModal() {
        this.isEditing = false;
        this.currentTip = null;
        this.editModalTitle.textContent = 'Add New Tip';
        this.resetForm();
        this.editModal.style.display = 'flex';
        this.tipTitle.focus();
    }

    openEditModal(tipId) {
        const tip = this.tips.find(t => t.id === tipId);
        if (!tip) return;

        this.isEditing = true;
        this.currentTip = tip;
        this.editModalTitle.textContent = 'Edit Tip';

        // Populate form with existing data
        this.tipTitle.value = tip.title;
        this.tipCategory.value = tip.category;
        this.tipProblem.value = tip.problem;
        this.tipAnswer.value = tip.solution || tip.chatgpt_answer;
        this.tipLocation.value = tip.location || '';
        this.tipAdditionalDetails.value = tip.additional_details || '';

        this.editModal.style.display = 'flex';
        this.tipTitle.focus();
    }

    openDeleteModal(tipId) {
        const tip = this.tips.find(t => t.id === tipId);
        if (!tip) return;

        this.currentTip = tip;
        this.deleteModal.style.display = 'flex';
    }

    closeDeleteModal() {
        this.deleteModal.style.display = 'none';
        this.currentTip = null;
    }

    async confirmDelete() {
        if (!this.currentTip) return;

        try {
            const response = await fetch(`/api/tips/${this.currentTip.id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete tip');
            }

            this.closeDeleteModal();
            this.loadTips(); // Reload tips list

        } catch (error) {
            alert('Failed to delete tip. Please try again.');
            console.error('Error deleting tip:', error);
        }
    }

    closeModals() {
        this.tipModal.style.display = 'none';
        this.editModal.style.display = 'none';
        this.deleteModal.style.display = 'none';
        this.settingsModal.style.display = 'none';
        this.resetForm();
        this.currentTip = null;
    }

    resetForm() {
        this.tipForm.reset();
        this.selectedFiles = [];
        this.filePreview.innerHTML = '';
    }

    async handleFormSubmit(e) {
        e.preventDefault();

        const tipData = {
            title: this.tipTitle.value.trim(),
            category: this.tipCategory.value,
            problem: this.tipProblem.value.trim(),
            solution: this.tipAnswer.value.trim(),
            location: this.tipLocation.value.trim() || null,
            additional_details: this.tipAdditionalDetails.value.trim() || null,
            author_name: 'User' // Add author name for audit logging
        };

        try {
            let response;
            if (this.isEditing && this.currentTip) {
                // Update existing tip
                response = await fetch(`/api/tips/${this.currentTip.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(tipData)
                });
            } else {
                // Create new tip
                response = await fetch('/api/tips', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(tipData)
                });
            }

            if (!response.ok) {
                throw new Error('Failed to save tip');
            }

            const savedTip = await response.json();
            console.log('Tip saved successfully:', savedTip);

            // Store selected files before modal closes (since closeModals() calls resetForm())
            const filesToUpload = [...this.selectedFiles];
            console.log('Files to upload:', filesToUpload.length, filesToUpload);

            this.closeModals();

            // Upload attachments if any (after modal is closed to avoid clearing selectedFiles)
            if (filesToUpload.length > 0) {
                console.log('Starting attachment upload for tip ID:', savedTip.id, 'in', this.isEditing ? 'edit' : 'create', 'mode');
                try {
                    const uploadResult = await this.uploadAttachments(savedTip.id, filesToUpload);
                    console.log('Attachment upload successful:', uploadResult);
                    alert('Tip and attachments saved successfully!');
                } catch (uploadError) {
                    console.error('Tip saved but attachment upload failed:', uploadError);
                    alert('Tip saved successfully, but there was an error uploading attachments. Please try adding them later by editing the tip.');
                }
            } else {
                console.log('No files to upload');
                alert('Tip saved successfully!');
            }

            this.loadTips(); // Reload all tips

        } catch (error) {
            alert('Failed to save tip. Please try again.');
            console.error('Error saving tip:', error);
        }
    }

    showLoading() {
        this.loading.style.display = 'block';
        this.error.style.display = 'none';
        this.tipsContainer.innerHTML = '';
    }

    hideLoading() {
        this.loading.style.display = 'none';
    }

    showError(message) {
        this.error.textContent = message;
        this.error.style.display = 'block';
        this.loading.style.display = 'none';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    updateModalSections(tip) {
        const modalContent = this.modalAnswer.closest('.modal-content');

        // Remove existing location and additional details sections
        const existingLocation = modalContent.querySelector('.location-section');
        const existingAdditional = modalContent.querySelector('.additional-section');

        if (existingLocation) existingLocation.remove();
        if (existingAdditional) existingAdditional.remove();

        // Add location section if it exists
        if (tip.location) {
            const locationSection = document.createElement('div');
            locationSection.className = 'tip-section location-section';
            locationSection.innerHTML = `
                <h3>Location:</h3>
                <p>${this.escapeHtml(tip.location)}</p>
            `;
            this.modalAnswer.closest('.tip-section').after(locationSection);
        }

        // Add additional details section if it exists
        if (tip.additional_details) {
            const additionalSection = document.createElement('div');
            additionalSection.className = 'tip-section additional-section';
            additionalSection.innerHTML = `
                <h3>Additional Details:</h3>
                <p>${this.escapeHtml(tip.additional_details)}</p>
            `;
            const insertAfter = tip.location ?
                modalContent.querySelector('.location-section') :
                this.modalAnswer.closest('.tip-section');
            insertAfter.after(additionalSection);
        }
    }

    async loadAttachments(tipId) {
        try {
            console.log('Loading attachments for tip ID:', tipId);
            const response = await fetch(`/api/tips/${tipId}/attachments`);
            console.log('Attachments API response status:', response.status);

            if (!response.ok) {
                console.error('Failed to load attachments:', response.status, response.statusText);
                return;
            }

            const attachments = await response.json();
            console.log('Loaded attachments:', attachments);
            this.displayAttachments(attachments);
        } catch (error) {
            console.error('Error loading attachments:', error);
        }
    }

    displayAttachments(attachments) {
        if (!attachments || attachments.length === 0) return;

        const modalContent = this.modalAnswer.closest('.modal-content');

        // Remove existing attachments section
        const existingAttachments = modalContent.querySelector('.attachments-section');
        if (existingAttachments) existingAttachments.remove();

        const attachmentsSection = document.createElement('div');
        attachmentsSection.className = 'tip-section attachments-section';

        let attachmentsHtml = '<h3>Attachments:</h3>';
        attachments.forEach(attachment => {
            const fileUrl = `/uploads/tips/${attachment.filename}`;
            const thumbnailUrl = attachment.thumbnail_path || fileUrl;

            attachmentsHtml += `
                <div class="attachment-item">
                    ${attachment.mime_type.startsWith('image/') ?
                        `<img src="${thumbnailUrl}" alt="${attachment.original_name}" class="attachment-thumbnail">` :
                        `<div class="attachment-thumbnail" style="background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 20px;">📄</div>`
                    }
                    <div class="attachment-info">
                        <div class="attachment-name">
                            <a href="${fileUrl}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(attachment.original_name)}</a>
                        </div>
                        <div class="attachment-meta">
                            ${this.formatFileSize(attachment.size)} • Uploaded by ${this.escapeHtml(attachment.uploaded_by)}
                        </div>
                    </div>
                </div>
            `;
        });

        attachmentsSection.innerHTML = attachmentsHtml;

        // Insert after the last tip section
        const lastSection = modalContent.querySelector('.tip-section:last-of-type');
        if (lastSection) {
            lastSection.after(attachmentsSection);
        } else {
            modalContent.appendChild(attachmentsSection);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // File handling methods
    handleFileSelection(event) {
        const files = Array.from(event.target.files);
        this.selectedFiles = files;
        this.updateFilePreview();
    }

    updateFilePreview() {
        this.filePreview.innerHTML = '';

        this.selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';

            // Create thumbnail for images
            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                const reader = new FileReader();
                reader.onload = (e) => {
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
                fileItem.appendChild(img);
            }

            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-info';
            fileInfo.innerHTML = `
                <div class="file-name">${this.escapeHtml(file.name)}</div>
                <div class="file-size">${this.formatFileSize(file.size)}</div>
            `;

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'remove-file';
            removeBtn.textContent = '×';
            removeBtn.onclick = () => this.removeFile(index);

            fileItem.appendChild(fileInfo);
            fileItem.appendChild(removeBtn);
            this.filePreview.appendChild(fileItem);
        });
    }

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.updateFilePreview();
        // Update the file input to reflect the changes
        const dt = new DataTransfer();
        this.selectedFiles.forEach(file => dt.items.add(file));
        this.tipAttachments.files = dt.files;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async uploadAttachments(tipId, files) {
        console.log('uploadAttachments called with tipId:', tipId, 'files:', files);
        if (!files || files.length === 0) {
            console.log('No files to upload');
            return;
        }

        const formData = new FormData();
        files.forEach((file, index) => {
            console.log(`Adding file ${index}:`, file.name, file.size, file.type);
            formData.append('attachments', file);
        });
        formData.append('author_name', 'Anonymous'); // Can be enhanced with user system later

        try {
            console.log('Sending upload request to:', `/api/tips/${tipId}/attachments`);
            const response = await fetch(`/api/tips/${tipId}/attachments`, {
                method: 'POST',
                body: formData
            });

            console.log('Upload response status:', response.status);
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Upload failed with response:', errorText);
                throw new Error(`Failed to upload attachments: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const result = await response.json();
            console.log('Attachments uploaded successfully:', result);
            return result;
        } catch (error) {
            console.error('Error uploading attachments:', error);
            throw error;
        }
    }

    // Settings Modal Methods
    openSettingsModal() {
        this.settingsModal.style.display = 'flex';
        this.loadAuditLogs(); // Load audit logs when opening settings
    }

    switchSettingsTab(tabName) {
        // Update tab buttons
        this.settingsTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab content
        this.settingsTabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}Tab`);
        });

        // Load content for the selected tab
        if (tabName === 'audit') {
            this.loadAuditLogs();
        } else if (tabName === 'stats') {
            this.loadAuditStats();
        }
    }

    // Audit Log Methods
    async loadAuditLogs(page = 0) {
        try {
            this.auditLogContainer.innerHTML = '<div class="loading">Loading audit logs...</div>';

            const params = new URLSearchParams({
                limit: this.auditPageSize,
                offset: page * this.auditPageSize,
                action: this.auditFilter.value,
                authorName: this.auditAuthorFilter.value
            });

            const response = await fetch(`/api/audit-logs?${params}`);
            if (!response.ok) throw new Error('Failed to load audit logs');

            const data = await response.json();
            this.displayAuditLogs(data.logs, data.pagination, page);

        } catch (error) {
            console.error('Error loading audit logs:', error);
            this.auditLogContainer.innerHTML = '<div class="error">Failed to load audit logs</div>';
        }
    }

    displayAuditLogs(logs, pagination, page) {
        this.auditCurrentPage = page;

        if (!logs || logs.length === 0) {
            this.auditLogContainer.innerHTML = '<div class="no-logs">No audit logs found</div>';
            return;
        }

        const logsHtml = logs.map(log => {
            const actionClass = `audit-action-${log.action.toLowerCase()}`;
            const formattedDate = new Date(log.timestamp).toLocaleString();

            // Get display title from the data
            let displayTitle = '';
            if (log.new_data && log.new_data._displayTitle) {
                displayTitle = log.new_data._displayTitle;
            } else if (log.old_data && log.old_data._displayTitle) {
                displayTitle = log.old_data._displayTitle;
            } else {
                displayTitle = `${log.entity_type} #${log.entity_id}`;
            }

            // Get change description for updates
            let changeDetails = '';
            if (log.action === 'UPDATE' && log.new_data && log.new_data._changes) {
                changeDetails = `<br><small style="color: #666;">Changes: ${this.escapeHtml(log.new_data._changes)}</small>`;
            }

            return `
                <div class="audit-entry">
                    <div class="audit-info">
                        <div class="audit-action ${actionClass}">${log.action}</div>
                        <div class="audit-entity">"${this.escapeHtml(displayTitle)}"</div>
                        <div class="audit-details">By ${this.escapeHtml(log.author_name || 'Unknown')}${changeDetails}</div>
                        <div class="audit-timestamp">${formattedDate}</div>
                    </div>
                </div>
            `;
        }).join('');

        this.auditLogContainer.innerHTML = logsHtml;

        // Update pagination
        this.auditPrevBtn.disabled = page === 0;
        this.auditNextBtn.disabled = !pagination.hasMore;
        this.auditPageInfo.textContent = `Page ${page + 1}`;
    }

    // Audit Statistics Methods
    async loadAuditStats() {
        try {
            this.statsContainer.innerHTML = '<div class="loading">Loading statistics...</div>';

            const response = await fetch('/api/audit-logs/stats');
            if (!response.ok) throw new Error('Failed to load statistics');

            const stats = await response.json();
            this.displayAuditStats(stats);

        } catch (error) {
            console.error('Error loading audit stats:', error);
            this.statsContainer.innerHTML = '<div class="error">Failed to load statistics</div>';
        }
    }

    displayAuditStats(stats) {
        const statsHtml = `
            <div class="stats-grid">
                <div class="stats-card">
                    <div class="stats-number">${stats.totalLogs}</div>
                    <div class="stats-label">Total Events</div>
                </div>
                ${stats.logsByAction.map(action => `
                    <div class="stats-card">
                        <div class="stats-number">${action.count}</div>
                        <div class="stats-label">${action.action} Actions</div>
                    </div>
                `).join('')}
            </div>

            <div class="recent-activity">
                <h4>Recent Activity</h4>
                ${stats.recentActivity.map(activity => `
                    <div class="activity-item">
                        <strong>${activity.action}</strong> ${activity.entity_type} by ${this.escapeHtml(activity.author_name || 'Unknown')}
                        <br><small>${new Date(activity.timestamp).toLocaleString()}</small>
                    </div>
                `).join('')}
            </div>
        `;

        this.statsContainer.innerHTML = statsHtml;
    }

    // Comment Methods
    async loadComments(tipId) {
        try {
            console.log('Loading comments for tip ID:', tipId);
            this.commentsContainer.innerHTML = '<div class="loading">Loading comments...</div>';

            const response = await fetch(`/api/tips/${tipId}/comments`);
            if (!response.ok) throw new Error('Failed to load comments');

            const comments = await response.json();
            console.log('Loaded comments:', comments);

            this.displayComments(comments);
        } catch (error) {
            console.error('Error loading comments:', error);
            this.commentsContainer.innerHTML = '<div class="error">Failed to load comments</div>';
        }
    }

    displayComments(comments) {
        if (!comments || comments.length === 0) {
            this.commentsContainer.innerHTML = '<div class="no-comments">No comments yet. Be the first to share your thoughts!</div>';
            return;
        }

        const commentsHtml = comments.map(comment => this.renderComment(comment)).join('');
        this.commentsContainer.innerHTML = commentsHtml;
    }

    renderComment(comment) {
        const formattedDate = new Date(comment.created_at).toLocaleString();
        const repliesHtml = comment.replies ? comment.replies.map(reply => this.renderComment(reply)).join('') : '';

        return `
            <div class="comment" data-comment-id="${comment.id}">
                <div class="comment-author">${this.escapeHtml(comment.author_name)}</div>
                <div class="comment-content">${this.escapeHtml(comment.content)}</div>
                <div class="comment-meta">
                    ${formattedDate}
                    <span class="comment-actions">
                        <button class="reply-btn" onclick="app.replyToComment(${comment.id}, '${this.escapeHtml(comment.author_name)}')">Reply</button>
                    </span>
                </div>
                ${repliesHtml ? `<div class="comment-replies">${repliesHtml}</div>` : ''}
            </div>
        `;
    }

    replyToComment(parentId, authorName) {
        this.parentCommentId.value = parentId;
        this.commentContent.placeholder = `Reply to ${authorName}'s comment...`;
        this.commentContent.focus();
        this.cancelReplyBtn.style.display = 'inline-block';

        // Scroll to comment form
        document.getElementById('commentForm').scrollIntoView({ behavior: 'smooth' });
    }

    cancelReply() {
        this.parentCommentId.value = '';
        this.commentContent.placeholder = 'Share your thoughts or feedback...';
        this.cancelReplyBtn.style.display = 'none';
    }

    async handleCommentSubmit(e) {
        e.preventDefault();

        if (!this.currentTip) {
            alert('No tip selected for commenting');
            return;
        }

        const content = this.commentContent.value.trim();
        const parentId = this.parentCommentId.value;

        if (!content) {
            alert('Please enter a comment');
            return;
        }

        try {
            const commentData = {
                content: content,
                parent_id: parentId || null
            };

            console.log('Submitting comment:', commentData);

            const response = await fetch(`/api/tips/${this.currentTip.id}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(commentData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to post comment');
            }

            const newComment = await response.json();
            console.log('Comment posted successfully:', newComment);

            // Reset form
            this.commentForm.reset();
            this.cancelReply();

            // Reload comments
            this.loadComments(this.currentTip.id);

            alert('Comment posted successfully!');

        } catch (error) {
            console.error('Error posting comment:', error);
            alert('Failed to post comment: ' + error.message);
        }
    }

    // Settings Modal Methods
    openSettingsModal() {
        this.settingsModal.style.display = 'flex';
        this.loadAuditLogs(); // Load audit logs when opening settings
    }

    switchSettingsTab(tabName) {
        // Update tab buttons
        this.settingsTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab content
        this.settingsTabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}Tab`);
        });

        // Load content for the selected tab
        if (tabName === 'audit') {
            this.loadAuditLogs();
        } else if (tabName === 'stats') {
            this.loadAuditStats();
        }
    }

    // Theme management
    initializeTheme() {
        // Check for saved theme preference or default to light mode
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const defaultTheme = savedTheme || (prefersDark ? 'dark' : 'light');

        this.setTheme(defaultTheme);
        if (this.darkModeToggle) {
            this.darkModeToggle.checked = defaultTheme === 'dark';
        }
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }

    toggleDarkMode(enabled) {
        const theme = enabled ? 'dark' : 'light';
        this.setTheme(theme);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TipsTracker();
});