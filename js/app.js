// js/app.js
// Main Application Logic

const ADMIN_PASSWORD = "eco"; // Initial simple password

const App = {
    currentCondoId: null,

    init() {
        this.bindEvents();
        setTimeout(() => this.loadTechDashboard(), 500); // Give Firebase a moment to init
    },

    bindEvents() {
        // Navigation & Modals
        document.getElementById('btnAdminAuth').addEventListener('click', () => {
            document.getElementById('modalAuth').style.display = 'flex';
        });
        document.getElementById('btnCloseAuth').addEventListener('click', () => {
            document.getElementById('modalAuth').style.display = 'none';
        });
        document.getElementById('btnSubmitAuth').addEventListener('click', () => this.handleAdminAuth());

        document.getElementById('btnBackToTech').addEventListener('click', () => this.switchView('viewTechDashboard'));
        document.getElementById('btnLogoutAdmin').addEventListener('click', () => {
            sessionStorage.removeItem('adminAuth');
            this.switchView('viewTechDashboard');
        });

        // Condo Management
        document.getElementById('btnNewCondo').addEventListener('click', () => this.createNewCondo());

        // Form Management
        document.getElementById('btnAddWaterMeter').addEventListener('click', () => this.addWaterMeterRow());
        document.getElementById('installationForm').addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Export Management
        document.getElementById('btnExportExcel').addEventListener('click', () => {
             const condoId = document.getElementById('exportCondoSelect').value;
             if (!condoId) {
                 alert("Por favor, selecione um condomínio para exportar.");
                 return;
             }
             ExportService.generateExcel(condoId);
        });

        // Global Scanner delegation
        document.addEventListener('click', (e) => {
            const scanBtn = e.target.closest('.btn-scan');
            if (scanBtn) {
                let targetId = scanBtn.getAttribute('data-target');
                if (targetId === 'dynamic') {
                    const parent = scanBtn.closest('.scan-input');
                    const input = parent.querySelector('input');
                    ScannerService.startScanner(input);
                } else {
                    ScannerService.startScanner(targetId);
                }
            }
        });

        // Global Photo Preview delegation
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('photo-input')) {
                const file = e.target.files[0];
                if (file) {
                    const preview = e.target.closest('.photo-capture').querySelector('.photo-preview');
                    preview.src = URL.createObjectURL(file);
                    preview.style.display = 'block';
                }
            }
        });
    },

    switchView(viewId) {
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        
        if (viewId === 'viewTechDashboard') {
            this.loadTechDashboard();
        } else if (viewId === 'viewAdminDashboard') {
            this.loadAdminDashboard();
        }
    },

    async loadTechDashboard() {
        const listDiv = document.getElementById('condoList');
        // keep loading state
        
        try {
            const condos = await DBService.getCondominiums();
            
            if (condos.length === 0) {
                listDiv.innerHTML = '<div class="empty-state">Nenhum condomínio cadastrado ainda.</div>';
                return;
            }

            listDiv.innerHTML = '';
            for (let c of condos) {
                let count = await DBService.getUnitCountByCondo(c.id); // Firestore id
                const div = document.createElement('div');
                div.className = 'list-item';
                div.innerHTML = `
                    <div>
                        <div class="list-item-title">${c.name}</div>
                        <div class="list-item-subtitle">${new Date(c.createdAt).toLocaleDateString('pt-BR')} • ${count} unidades registradas</div>
                    </div>
                    <button class="btn-primary" onclick="App.openInstallationForm('${c.id}', '${c.name.replace(/'/g, "\\'")}')">
                        + Unidade
                    </button>
                `;
                listDiv.appendChild(div);
            }
        } catch(e) {
             listDiv.innerHTML = '<div class="empty-state">Carregando condomínios da nuvem... (Verifique a permissão do banco)</div>';
        }
    },

    async createNewCondo() {
        const name = prompt("Digite o nome do novo Condomínio/Projeto:");
        if (name && name.trim() !== '') {
            await DBService.addCondominium(name.trim());
            this.loadTechDashboard();
        }
    },

    openInstallationForm(condoId, condoName) {
        this.currentCondoId = condoId;
        document.getElementById('condoId').value = condoId;
        document.getElementById('formCondoName').innerText = condoName;
        
        // Reset Form
        document.getElementById('installationForm').reset();
        document.getElementById('waterMetersList').innerHTML = '';
        document.querySelectorAll('.photo-preview').forEach(img => {
            img.src = '';
            img.style.display = 'none';
        });
        
        this.addWaterMeterRow(); // At least one water meter by default

        this.switchView('viewInstallationForm');
    },

    addWaterMeterRow() {
        const list = document.getElementById('waterMetersList');
        const template = document.getElementById('tmpl-water-meter');
        const clone = template.content.cloneNode(true);
        
        clone.querySelector('.btn-remove-meter').addEventListener('click', function() {
            this.closest('.meter-item').remove();
        });

        list.appendChild(clone);
    },

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> OBTENDO GPS E ENVIANDO FOTOS...';

        try {
            // Get GPS Data
            const gps = await this.getCurrentPosition();

            // Collect files
            const gasFile = document.getElementById('iptGasPhoto').files[0];
            const powerFile = document.getElementById('iptPowerPhoto').files[0];

            let gasPhotoUrl = null;
            if (gasFile) gasPhotoUrl = await DBService.uploadPhoto(gasFile, 'gas');
            
            let powerPhotoUrl = null;
            if (powerFile) powerPhotoUrl = await DBService.uploadPhoto(powerFile, 'power');

            // Collect Data
            const iptGas = document.getElementById('iptGas').value.trim();
            const iptPower = document.getElementById('iptPower').value.trim();

            const formData = {
                condoId: document.getElementById('condoId').value, // now string from Firestore
                bloco: document.getElementById('iptBloco').value.trim(),
                apto: document.getElementById('iptApto').value.trim(),
                
                gasMeter: iptGas ? {
                    serial: iptGas,
                    transmitter: document.getElementById('iptGasTransmitter').value.trim() || null,
                    photo: gasPhotoUrl
                } : null,
                
                powerMeter: iptPower ? {
                    serial: iptPower,
                    transmitter: document.getElementById('iptPowerTransmitter').value.trim() || null,
                    photo: powerPhotoUrl
                } : null,
                
                waterMeters: [],
                gps: gps
            };

            const meterItems = document.querySelectorAll('#waterMetersList .meter-item');
            for (let item of meterItems) {
                const type = item.querySelector('.meter-type').value;
                const serial = item.querySelector('.meter-serial').value.trim();
                const transmitter = item.querySelector('.meter-transmitter').value.trim() || null;
                const fileInput = item.querySelector('.meter-photo');
                
                let wPhotoUrl = null;
                if (fileInput && fileInput.files[0]) {
                    wPhotoUrl = await DBService.uploadPhoto(fileInput.files[0], 'water');
                }

                if (serial) {
                    formData.waterMeters.push({ type, serial, transmitter, photo: wPhotoUrl });
                }
            }

            // Save to Firestore DB
            await DBService.addUnit(formData);

            alert(`✅ Unidade ${formData.bloco}-${formData.apto} registrada com sucesso na nuvem!`);
            
            // Return to Tech Dashboard
            this.switchView('viewTechDashboard');

        } catch (error) {
            console.error(error);
            alert("Erro ao registrar unidade.");
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fas fa-check-circle"></i> SALVAR UNIDADE (BLOQUEAR)';
        }
    },

    getCurrentPosition() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve(null);
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    resolve({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    });
                },
                (err) => {
                    console.warn(`GPS Error: ${err.message}`);
                    resolve(null);
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        });
    },

    // --- Admin Logic ---
    
    handleAdminAuth() {
        const pass = document.getElementById('iptAdminPassword').value;
        if (pass === ADMIN_PASSWORD) {
            document.getElementById('modalAuth').style.display = 'none';
            document.getElementById('iptAdminPassword').value = '';
            document.getElementById('authErrorMsg').style.display = 'none';
            sessionStorage.setItem('adminAuth', 'true');
            this.switchView('viewAdminDashboard');
        } else {
            document.getElementById('authErrorMsg').style.display = 'block';
        }
    },

    async loadAdminDashboard() {
        if (sessionStorage.getItem('adminAuth') !== 'true') return;

        const listDiv = document.getElementById('adminCondoList');
        const select = document.getElementById('exportCondoSelect');
        
        listDiv.innerHTML = '<div class="empty-state">Sincronizando com a Nuvem...</div>';
        select.innerHTML = '<option value="" disabled selected>Selecione um Condomínio</option>';
        
        const condos = await DBService.getCondominiums();
        
        if (condos.length === 0) {
            listDiv.innerHTML = '<div class="empty-state">Nenhum dado cadastrado para exportação.</div>';
            return;
        }
        
        listDiv.innerHTML = '';

        for (let c of condos) {
            // Fill select
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.innerText = c.name;
            select.appendChild(opt);

            // Fill list
            let count = await DBService.getUnitCountByCondo(c.id);
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `
                <div>
                    <div class="list-item-title">${c.name}</div>
                    <div class="list-item-subtitle">${count} unidades totais na nuvem.</div>
                </div>
            `;
            listDiv.appendChild(div);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
