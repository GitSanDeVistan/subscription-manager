document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let subscriptions = JSON.parse(localStorage.getItem('subsk_data')) || [];
    let currentEditId = null;

    // --- DOM Elements ---
    const addBtn = document.getElementById('add-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const modal = document.getElementById('modal');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const closeSettingsBtn = document.getElementById('close-settings');
    const subForm = document.getElementById('sub-form');
    const deleteBtn = document.getElementById('delete-btn');
    const subList = document.getElementById('subscription-list');
    const emptyState = document.getElementById('empty-state');
    
    // Settings Elements
    const bgColorPicker = document.getElementById('bg-color-picker');
    const resetBgBtn = document.getElementById('reset-bg-btn');
    
    // Dashboard Elements
    const monthlyTotalEl = document.getElementById('monthly-total');
    const yearlyTotalEl = document.getElementById('yearly-total');
    const serviceCountEl = document.getElementById('service-count');
    
    // Form Elements
    const nameInput = document.getElementById('sub-name');
    const priceInput = document.getElementById('sub-price');
    const cycleInput = document.getElementById('sub-cycle');
    const domainInput = document.getElementById('sub-domain');
    const dateInput = document.getElementById('sub-date');
    const monthInput = document.getElementById('sub-month');
    const dayInput = document.getElementById('sub-day');
    const dateGroupYearly = document.getElementById('date-group-yearly');
    const dateGroupMonthly = document.getElementById('date-group-monthly');

    // --- Core Functions ---
    function initTheme() {
        const savedColor = localStorage.getItem('subsk_bg_color');
        if (savedColor) {
            document.documentElement.style.setProperty('--bg-color', savedColor);
            bgColorPicker.value = savedColor;
        }
    }

    function saveToStorage() {
        localStorage.setItem('subsk_data', JSON.stringify(subscriptions));
    }

    function calculateTotals() {
        let monthlyTotal = 0;
        let yearlyTotal = 0;

        subscriptions.forEach(sub => {
            const price = Number(sub.price);
            if (sub.cycle === 'monthly') {
                monthlyTotal += price;
                yearlyTotal += price * 12;
            } else if (sub.cycle === 'yearly') {
                monthlyTotal += price / 12;
                yearlyTotal += price;
            }
        });

        // Format and update DOM
        monthlyTotalEl.textContent = Math.round(monthlyTotal).toLocaleString();
        yearlyTotalEl.textContent = Math.round(yearlyTotal).toLocaleString();
        serviceCountEl.textContent = subscriptions.length;
    }

    function renderList() {
        subList.innerHTML = '';
        
        if (subscriptions.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            
            // Sort by next payment date if available, otherwise by name
            const sortedSubs = [...subscriptions].sort((a, b) => {
                if (a.nextDate && b.nextDate) return new Date(a.nextDate) - new Date(b.nextDate);
                if (a.nextDate) return -1;
                if (b.nextDate) return 1;
                return a.name.localeCompare(b.name);
            });

            sortedSubs.forEach(sub => {
                const li = document.createElement('li');
                li.className = 'sub-item';
                li.dataset.id = sub.id;
                
                const cycleText = sub.cycle === 'monthly' ? '月額' : '年額';
                const formattedPrice = Number(sub.price).toLocaleString();
                
                // Format Date
                let dateStr = '未設定';
                if (sub.cycle === 'monthly') {
                    if (sub.month && sub.day) {
                        dateStr = `${sub.month}月${sub.day}日`;
                    } else if (sub.day) {
                        dateStr = `毎月${sub.day}日`;
                    }
                } else if (sub.cycle === 'yearly') {
                    if (sub.nextDate) {
                        const d = new Date(sub.nextDate);
                        dateStr = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
                    }
                }
                
                // Get Logo
                let logoHtml = `<div class="sub-logo-fallback"><i class="fas fa-box"></i></div>`;
                if (sub.domain) {
                    let cleanDomain = sub.domain.trim();
                    if (!cleanDomain.startsWith('http')) {
                        cleanDomain = 'http://' + cleanDomain;
                    }
                    try {
                        cleanDomain = new URL(cleanDomain).hostname;
                    } catch (e) {
                        cleanDomain = cleanDomain.replace(/^https?:\/\//, '').split('/')[0];
                    }
                    
                    if (cleanDomain) {
                        // Google Favicon API (128px) を使用 (Clearbitより取得成功率が高い)
                        const logoUrl = `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=128`;
                        logoHtml = `<img src="${logoUrl}" class="sub-logo" onerror="this.onerror=null; this.outerHTML='<div class=\\'sub-logo-fallback\\'><i class=\\'fas fa-box\\'></i></div>'">`;
                    }
                }

                li.innerHTML = `
                    <div class="sub-item-left-wrapper">
                        ${logoHtml}
                        <div class="sub-info-left">
                            <span class="sub-name">${sub.name}</span>
                            <span class="sub-date"><i class="far fa-calendar-alt"></i> ${dateStr}</span>
                        </div>
                    </div>
                    <div class="sub-info-right">
                        <span class="sub-price">¥${formattedPrice}</span>
                        <span class="sub-cycle-badge">${cycleText}</span>
                    </div>
                `;
                
                li.addEventListener('click', () => openModal(sub));
                subList.appendChild(li);
            });
        }
        
        calculateTotals();
    }

    // --- Modal Handling ---
    function toggleDateInputs() {
        if (cycleInput.value === 'monthly') {
            dateGroupYearly.classList.add('hidden');
            dateGroupMonthly.classList.remove('hidden');
        } else {
            dateGroupMonthly.classList.add('hidden');
            dateGroupYearly.classList.remove('hidden');
        }
    }

    function openModal(sub = null) {
        modal.classList.remove('hidden');
        
        if (sub) {
            // Edit mode
            document.getElementById('modal-title').textContent = 'サブスクリプション編集';
            currentEditId = sub.id;
            nameInput.value = sub.name;
            priceInput.value = sub.price;
            cycleInput.value = sub.cycle;
            domainInput.value = sub.domain || '';
            dateInput.value = sub.nextDate || '';
            monthInput.value = sub.month || '';
            dayInput.value = sub.day || '';
            deleteBtn.classList.remove('hidden');
        } else {
            // Add mode
            document.getElementById('modal-title').textContent = 'サブスクリプション追加';
            currentEditId = null;
            subForm.reset();
            cycleInput.value = 'monthly';
            domainInput.value = '';
            monthInput.value = '';
            dayInput.value = '';
            deleteBtn.classList.add('hidden');
        }
        toggleDateInputs();
    }

    function closeModal() {
        modal.classList.add('hidden');
    }

    function openSettings() {
        settingsModal.classList.remove('hidden');
    }

    function closeSettings() {
        settingsModal.classList.add('hidden');
    }

    // --- Event Listeners ---
    addBtn.addEventListener('click', () => openModal());
    closeModalBtn.addEventListener('click', closeModal);
    
    settingsBtn.addEventListener('click', openSettings);
    closeSettingsBtn.addEventListener('click', closeSettings);

    bgColorPicker.addEventListener('input', (e) => {
        document.documentElement.style.setProperty('--bg-color', e.target.value);
    });

    bgColorPicker.addEventListener('change', (e) => {
        localStorage.setItem('subsk_bg_color', e.target.value);
    });

    resetBgBtn.addEventListener('click', () => {
        const defaultColor = '#0f172a';
        document.documentElement.style.setProperty('--bg-color', defaultColor);
        bgColorPicker.value = defaultColor;
        localStorage.removeItem('subsk_bg_color');
    });
    
    cycleInput.addEventListener('change', toggleDateInputs);

    // Close modal on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeSettings();
    });

    subForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const subData = {
            id: currentEditId || Date.now().toString(),
            name: nameInput.value,
            price: Number(priceInput.value),
            cycle: cycleInput.value,
            domain: domainInput.value.trim(),
            nextDate: cycleInput.value === 'yearly' ? dateInput.value || null : null,
            month: cycleInput.value === 'monthly' ? monthInput.value || null : null,
            day: cycleInput.value === 'monthly' ? dayInput.value || null : null
        };

        if (currentEditId) {
            // Update
            const index = subscriptions.findIndex(s => s.id === currentEditId);
            if (index !== -1) subscriptions[index] = subData;
        } else {
            // Add
            subscriptions.push(subData);
        }

        saveToStorage();
        renderList();
        closeModal();
    });

    deleteBtn.addEventListener('click', () => {
        if (!currentEditId) return;
        if (confirm('このサブスクリプションを削除しますか？')) {
            subscriptions = subscriptions.filter(s => s.id !== currentEditId);
            saveToStorage();
            renderList();
            closeModal();
        }
    });

    // --- Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW registered: ', registration);
                })
                .catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                });
        });
    }

    // --- Initial Render ---
    initTheme();
    renderList();
});
