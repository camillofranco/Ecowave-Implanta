// js/export.js
// Handles exporting data to an Excel (.xlsx) file using exceljs

const ExportService = {
    async generateExcel(condoId) {
        try {
            // Get data
            const units = await DBService.getAllUnitsForExport(condoId);
            const condos = await DBService.getCondominiums();
            const condoMap = condos.reduce((acc, c) => {
                acc[c.id] = c.name;
                return acc;
            }, {});

            if (units.length === 0) {
                alert("Não há dados para exportar neste condomínio.");
                return;
            }

            // Create workbook and worksheet
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Ecowave Implanta';
            workbook.created = new Date();

            const worksheet = workbook.addWorksheet('Implantações');

            // Define columns
            worksheet.columns = [
                { header: 'Condomínio', key: 'condominio', width: 25 },
                { header: 'Data/Hora', key: 'dataHora', width: 20 },
                { header: 'Bloco', key: 'bloco', width: 10 },
                { header: 'Apto', key: 'apto', width: 10 },
                { header: 'Tipo Medidor', key: 'tipo', width: 20 },
                { header: 'Número de Série', key: 'serie', width: 25 },
                { header: 'Transmissor', key: 'transmissor', width: 20 },
                { header: 'Latitude GPS', key: 'lat', width: 15 },
                { header: 'Longitude GPS', key: 'lng', width: 15 }
            ];

            // Style headers
            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern:'solid',
                fgColor:{ argb:'FF0088FF' }
            };

            // Add rows
            units.forEach(unit => {
                const baseRow = {
                    condominio: condoMap[unit.condoId] || `ID ${unit.condoId}`,
                    dataHora: new Date(unit.createdAt).toLocaleString('pt-BR'),
                    bloco: unit.bloco,
                    apto: unit.apto,
                    transmissor: unit.data_full.transmitter || 'N/A',
                    lat: unit.data_full.gps ? unit.data_full.gps.lat : 'N/A',
                    lng: unit.data_full.gps ? unit.data_full.gps.lng : 'N/A'
                };

                // Add Water Meters (1 row per meter)
                if (unit.data_full.waterMeters && unit.data_full.waterMeters.length > 0) {
                    unit.data_full.waterMeters.forEach(wm => {
                        worksheet.addRow({ ...baseRow, tipo: wm.type, serie: wm.serial });
                    });
                }

                // Add Gas Meter
                if (unit.data_full.gasMeter) {
                    worksheet.addRow({ ...baseRow, tipo: 'Gás', serie: unit.data_full.gasMeter });
                }

                // Add Power Meter
                if (unit.data_full.powerMeter) {
                    worksheet.addRow({ ...baseRow, tipo: 'Energia', serie: unit.data_full.powerMeter });
                }
            });

            // Generate buffer and save file
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            
            const filename = condoId === 'all' 
                ? `Relatorio_Geral_Ecowave_${new Date().toISOString().split('T')[0]}.xlsx` 
                : `Relatorio_Ecowave_${condoMap[condoId] || condoId}_${new Date().toISOString().split('T')[0]}.xlsx`;

            saveAs(blob, filename);

        } catch (error) {
            console.error("Erro ao exportar Excel", error);
            alert("Ocorreu um erro ao gerar o arquivo Excel.");
        }
    }
};
