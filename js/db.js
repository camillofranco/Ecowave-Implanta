// js/db.js
// Firebase Cloud Implementation

const firebaseConfig = {
    apiKey: "AIzaSyCQU9BqER88aR90G3IeXcfdPcd22f8L4UY",
    authDomain: "ecowave-implanta.firebaseapp.com",
    projectId: "ecowave-implanta",
    storageBucket: "ecowave-implanta.firebasestorage.app",
    messagingSenderId: "538343315852",
    appId: "1:538343315852:web:cdf5c2c019c7cb77b15ea9",
    measurementId: "G-20Z4VG5ZR3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

const DBService = {
    async getCondominiums() {
        const snapshot = await db.collection('condominiums').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async addCondominium(name) {
        return await db.collection('condominiums').add({
            name: name,
            createdAt: new Date().toISOString()
        });
    },

    async deleteCondominium(id) {
        // First delete all units
        const unitsSnapshot = await db.collection('units').where('condoId', '==', id).get();
        const batch = db.batch();
        unitsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        // Delete condo
        batch.delete(db.collection('condominiums').doc(id));
        return await batch.commit();
    },

    async getUnitsByCondo(condoId) {
        const snapshot = await db.collection('units').where('condoId', '==', condoId).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async getUnitCountByCondo(condoId) {
        const snapshot = await db.collection('units').where('condoId', '==', condoId).get();
        return snapshot.size;
    },

    async addUnit(unitData) {
        // Create blind data (so later we can restrict access if needed via Firestore Security Rules,
        // but for now, tech just sees units without serials)
        const blindData = {
            resumo: `${unitData.waterMeters.length} Água, ${unitData.gasMeter ? '1 Gás' : 'Sem Gás'}, ${unitData.powerMeter ? '1 Energia' : 'Sem Energia'}`,
            hasTransmitter: true
        };

        const entity = {
            condoId: unitData.condoId,
            bloco: unitData.bloco,
            apto: unitData.apto,
            data_blind: blindData,
            data_full: unitData,
            createdAt: new Date().toISOString()
        };

        return await db.collection('units').add(entity);
    },

    // Upload photo to Firebase Storage and return public URL
    async uploadPhoto(file, path) {
        if (!file) return null;
        
        const TIMEOUT_MS = 20000; // 20s Max limit
        const uploadPromise = new Promise(async (resolve, reject) => {
            try {
                const compressedBlob = await this.compressImage(file);
                const storageRef = storage.ref();
                const photoRef = storageRef.child(`photos/${path}_${Date.now()}_${file.name}`);
                
                const uploadTask = photoRef.put(compressedBlob);
                uploadTask.on('state_changed', 
                    (snapshot) => {
                        // Progress can be logged here
                        let p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        console.log(`Uploading ${path}: ${p}%`);
                    }, 
                    (error) => {
                        // Error handling (like unauthorized)
                        reject(new Error(`Storage Error: ${error.message} (Verifique as Rules do Storage)`));
                    }, 
                    async () => {
                        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                        resolve(downloadURL);
                    }
                );
            } catch (e) {
                reject(e);
            }
        });

        return Promise.race([
            uploadPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Tempo limite (20s) excedido ao tentar enviar a foto. Isso ocorre se você não ativou o Test Mode no painel do Storage ou a rede desconectou.`)), TIMEOUT_MS))
        ]).catch(e => {
            console.error("Upload error wrapper: ", e);
            throw e; // Rethrow to halt Promise.all
        });
    },

    compressImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = event => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1080;
                    const MAX_HEIGHT = 1080;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        resolve(blob || file);
                    }, 'image/jpeg', 0.6); // Compress to 60% quality JPEG
                };
                img.onerror = () => resolve(file);
                img.src = event.target.result;
            };
            reader.onerror = () => resolve(file);
            reader.readAsDataURL(file);
        });
    },

    async getAllUnitsForExport(condoId = 'all') {
        let snapshot;
        if (condoId === 'all') {
            snapshot = await db.collection('units').get();
        } else {
            snapshot = await db.collection('units').where('condoId', '==', condoId).get();
        }
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
};
