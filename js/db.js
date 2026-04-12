// js/db.js
// Initialize Dexie for local storage
const db = new Dexie('EcowaveImplantaDB');

// Define database schema
// Condominiums just stores the name
// Units stores the blind data for Techs and full data for Admins.
db.version(1).stores({
    condominiums: '++id, name, createdAt',
    units: '++id, condoId, bloco, apto, data_blind, data_full, createdAt'
});

// A blind record structure for technicians
// It doesn't contain serial numbers, just what they added.
// data_full contains all the sensitive data for the excel export.

const DBService = {
    async getCondominiums() {
        return await db.condominiums.orderBy('createdAt').reverse().toArray();
    },

    async addCondominium(name) {
        return await db.condominiums.add({
            name: name,
            createdAt: new Date().toISOString()
        });
    },

    async getUnitsByCondo(condoId) {
        return await db.units.where({ condoId: condoId }).toArray();
    },

    async getUnitCountByCondo(condoId) {
        return await db.units.where({ condoId: condoId }).count();
    },

    async addUnit(unitData) {
        // unitData shape: { condoId, bloco, apto, waterMeters: [], gasMeter, powerMeter, transmitter, gps: { lat, lng } }
        
        // Creating blind data so tech can see what they registered but NOT the serials
        const blindData = {
            resumo: `${unitData.waterMeters.length} Água, ${unitData.gasMeter ? '1 Gás' : 'Sem Gás'}, ${unitData.powerMeter ? '1 Energia' : 'Sem Energia'}`,
            hasTransmitter: !!unitData.transmitter
        };

        const entity = {
            condoId: unitData.condoId,
            bloco: unitData.bloco,
            apto: unitData.apto,
            data_blind: blindData,
            data_full: unitData,
            createdAt: new Date().toISOString()
        };

        return await db.units.add(entity);
    },

    async getAllUnitsForExport(condoId = 'all') {
        if (condoId === 'all') {
            return await db.units.toArray();
        } else {
            return await db.units.where({ condoId: parseInt(condoId) }).toArray();
        }
    }
};
