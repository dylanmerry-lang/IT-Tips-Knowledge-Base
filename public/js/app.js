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
        this.cancelBtn = document.getElementById('cancelBtn');
        this.addTipBtn = document.getElementById('addTipBtn');

        // Delete modal elements
        this.cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
        this.confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    }

    attachEventListeners() {
        // Search and filter
        this.searchBtn.addEventListener('click', () => this.filterTips());
        this.searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.filterTips();
        });
        this.categoryFilter.addEventListener('change', () => this.filterTips());

        // Modal controls
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => this.closeModals());
        });

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target === this.tipModal || e.target === this.editModal || e.target === this.deleteModal) {
                this.closeModals();
            }
        });

        // Form handling
        this.tipForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        this.cancelBtn.addEventListener('click', () => this.closeModals());
        this.addTipBtn.addEventListener('click', () => this.openAddModal());

        // Delete modal handling
        this.cancelDeleteBtn.addEventListener('click', () => this.closeDeleteModal());
        this.confirmDeleteBtn.addEventListener('click', () => this.confirmDelete());
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
                                tip.chatgpt_answer.toLowerCase().includes(searchTerm);

            const matchesCategory = !categoryFilter || tip.category === categoryFilter;

            return matchesSearch && matchesCategory;
        });

        this.renderTips();
    }

    renderTips() {
        if (this.filteredTips.length === 0) {
            this.tipsContainer.innerHTML = '<p class="no-tips">No tips found matching your criteria.</p>';
            return;
        }

        this.tipsContainer.innerHTML = this.filteredTips.map(tip => `
            <div class="tip-card" data-tip-id="${tip.id}">
                <div class="tip-content">
                    <h3 class="tip-title">${this.escapeHtml(tip.title)}</h3>
                    <span class="tip-category">${this.escapeHtml(tip.category)}</span>
                    <p class="tip-preview">${this.escapeHtml(tip.problem.substring(0, 150))}...</p>
                    <div class="tip-date">${this.formatDate(tip.created_at)}</div>
                </div>
                <div class="tip-actions">
                    <button class="btn-edit" data-tip-id="${tip.id}" data-action="edit">Edit</button>
                    <button class="btn-delete" data-tip-id="${tip.id}" data-action="delete">Delete</button>
                </div>
            </div>
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
    }

    openTipModal(tipId) {
        const tip = this.tips.find(t => t.id === tipId);
        if (!tip) return;

        this.currentTip = tip;
        this.modalTitle.textContent = tip.title;
        this.modalCategory.textContent = tip.category;
        this.modalDate.textContent = this.formatDate(tip.created_at);
        this.modalProblem.textContent = tip.problem;
        this.modalAnswer.textContent = tip.chatgpt_answer;

        // Add action buttons to modal
        const existingActions = this.tipModal.querySelector('.modal-actions');
        if (existingActions) {
            existingActions.remove();
        }

        const modalActions = document.createElement('div');
        modalActions.className = 'modal-actions';
        modalActions.innerHTML = `
            <button class="btn-edit" data-tip-id="${tip.id}">Edit Tip</button>
            <button class="btn-delete" data-tip-id="${tip.id}">Delete Tip</button>
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
        this.tipAnswer.value = tip.chatgpt_answer;

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
        this.resetForm();
        this.currentTip = null;
    }

    resetForm() {
        this.tipForm.reset();
    }

    async handleFormSubmit(e) {
        e.preventDefault();

        const tipData = {
            title: this.tipTitle.value.trim(),
            category: this.tipCategory.value,
            problem: this.tipProblem.value.trim(),
            chatgpt_answer: this.tipAnswer.value.trim()
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
            this.closeModals();
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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TipsTracker();
});