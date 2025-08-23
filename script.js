    const SALES_SPREADSHEET_ID = "1HXyq_r2ssJ5c7wXdrBUc-WdqrlCfiZYE1EuIWbIDg0U";
    const SALES_SHEET_NAME = "ADESOES";
    const FUNDOS_SHEET_NAME = "FUNDOS";
    const METAS_SPREADSHEET_ID = "1KywSOsTn7qUdVp2dLthWD3Y27RsE1aInk6hRJhp7BFw";
    const METAS_SHEET_NAME = "metas";
    const API_KEY = "AIzaSyBuGRH91CnRuDtN5RGsb5DvHEfhTxJnWSs"; 
    Chart.defaults.color = '#FFFFFF';

    let allData = [], fundosData = [], metasData = new Map(), dataTable, vvrVsMetaPorMesChart, cumulativeVvrChart, monthlyVvrChart, yearlyStackedChart, monthlyStackedChart, yearlyTicketChart, monthlyTicketChart, yearlyContractsChart, monthlyContractsChart, monthlyAdesoesChart, yearlyAdesoesStackedChart, monthlyAdesoesStackedChart, consultorDataTable, detalhadaAdesoesDataTable, fundosDetalhadosDataTable;
    let currentVvrChartType = 'total';
    let currentTableDataType = 'total';
    let currentFilteredDataForTable = [];
    const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date)) return 'N/A';
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};
    
    const formatCurrency = (value) => new Intl.NumberFormat('pt-br', { style: 'currency', currency: 'BRL' }).format(value || 0);
    const formatPercent = (value) => new Intl.NumberFormat('pt-br', { style: 'percent', minimumFractionDigits: 1 }).format(value || 0);

    document.addEventListener('DOMContentLoaded', async () => {
        const loader = document.getElementById('loader');
        try {
            const [salesData, sheetData, novosFundosData] = await Promise.all([fetchAllSalesDataFromSheet(), fetchMetasData(), fetchFundosData()]);
            
            allData = salesData;
            metasData = sheetData;
            fundosData = novosFundosData;

            if (allData && allData.length > 0) {
                loader.style.display = 'none';
                [
                 'filters-section', 'kpi-section', 'kpi-section-py', 'chart-vvr-mes-section', 
                 'chart-cumulative-section', 'table-section', 'chart-monthly-vvr-section', 
                 'chart-yearly-stacked-section', 'chart-monthly-stacked-section', 'chart-yearly-ticket-section', 
                 'chart-monthly-ticket-section', 'chart-yearly-contracts-section', 'chart-monthly-contracts-section',
                 'chart-monthly-adesoes-section', 'chart-yearly-adesoes-stacked-section', 'chart-monthly-adesoes-stacked-section',
                 'consultor-table-section', 'detalhada-adesoes-table-section', 'fundos-detalhados-table-section'
                ].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.style.display = 'block';
                });
                document.getElementById('filters-section').style.display = 'flex';
                
                populateFilters();
                addEventListeners();
                updateDashboard();
            } else { 
                loader.innerHTML = 'Nenhum dado de vendas encontrado ou falha ao carregar. Verifique o console (F12) para mais detalhes.'; 
            }
        } catch (error) { 
            console.error("Erro fatal na inicialização:", error); 
            loader.innerHTML = `Erro ao carregar dados. Verifique o console (F12).`; 
        }
    });

    document.getElementById('sidebar-toggle').addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('collapsed');
        document.getElementById('main-content').classList.toggle('full-width');
        this.classList.toggle('collapsed');

        setTimeout(() => {
            if (vvrVsMetaPorMesChart) vvrVsMetaPorMesChart.resize();
            if (cumulativeVvrChart) cumulativeVvrChart.resize();
            if (monthlyVvrChart) monthlyVvrChart.resize();
            if (yearlyStackedChart) yearlyStackedChart.resize();
            if (monthlyStackedChart) monthlyStackedChart.resize();
            if (yearlyTicketChart) yearlyTicketChart.resize();
            if (monthlyTicketChart) monthlyTicketChart.resize();
            if (yearlyContractsChart) yearlyContractsChart.resize();
            if (monthlyContractsChart) monthlyContractsChart.resize();
            if (monthlyAdesoesChart) monthlyAdesoesChart.resize();
            if (yearlyAdesoesStackedChart) yearlyAdesoesStackedChart.resize();
            if (monthlyAdesoesStackedChart) monthlyAdesoesStackedChart.resize();
        }, 300);
    });
    
    async function fetchAllSalesDataFromSheet() {
        if (!SALES_SPREADSHEET_ID || !SALES_SHEET_NAME || !API_KEY) {
            console.error("ID da Planilha de Vendas, Nome da Aba ou Chave de API não configurados.");
            return [];
        }
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SALES_SPREADSHEET_ID}/values/${SALES_SHEET_NAME}?key=${API_KEY}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.error("Erro ao buscar dados de vendas da planilha:", await response.json());
                return [];
            }
            const data = await response.json();
            const rows = data.values || [];
            if (rows.length < 2) return [];

            const headers = rows[0].map(h => h.trim().toLowerCase());
            const unidadeIndex = headers.indexOf("nm_unidade");
            const dataIndex = headers.indexOf("dt_cadastro_integrante");
            const valorIndex = headers.indexOf("vl_plano");
            
            if (unidadeIndex === -1 || dataIndex === -1 || valorIndex === -1) {
                console.error("Colunas essenciais (nm_unidade, dt_cadastro_integrante, vl_plano) não foram encontradas.");
                return [];
            }

            const tipoVendaIndex = headers.indexOf("venda_posvenda");
            const indicadoPorIndex = headers.indexOf("indicado_por");
            const codigoIntegranteIndex = headers.indexOf("codigo_integrante");
            const nomeIntegranteIndex = headers.indexOf("nm_integrante");
            const idFundoIndex = headers.indexOf("id_fundo");

            return rows.slice(1).map(row => {
                const dataString = row[dataIndex];
                if (!dataString) return null;
                return {
                    nm_unidade: row[unidadeIndex] || 'N/A',
                    dt_cadastro_integrante: new Date(dataString),
                    vl_plano: parseFloat(String(row[valorIndex] || '0').replace(',', '.')) || 0,
                    venda_posvenda: tipoVendaIndex !== -1 ? row[tipoVendaIndex] || 'VENDA' : 'N/A',
                    indicado_por: indicadoPorIndex !== -1 ? row[indicadoPorIndex] || 'N/A' : 'N/A',
                    codigo_integrante: codigoIntegranteIndex !== -1 ? row[codigoIntegranteIndex] || 'N/A' : 'N/A',
                    nm_integrante: nomeIntegranteIndex !== -1 ? row[nomeIntegranteIndex] || 'N/A' : 'N/A',
                    id_fundo: idFundoIndex !== -1 ? row[idFundoIndex] || 'N/A' : 'N/A'
                };
            }).filter(Boolean);
        } catch (error) {
            console.error("Erro CRÍTICO ao buscar dados de vendas:", error);
            return [];
        }
    }

async function fetchFundosData() {
    if (!SALES_SPREADSHEET_ID || !FUNDOS_SHEET_NAME || !API_KEY) {
        console.error("ID da Planilha, Nome da Aba FUNDOS ou Chave de API não configurados.");
        return [];
    }
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SALES_SPREADSHEET_ID}/values/${FUNDOS_SHEET_NAME}?key=${API_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error("Erro ao buscar dados de fundos da planilha:", await response.json());
            return [];
        }
        const data = await response.json();
        const rows = data.values || [];
        if (rows.length < 2) return [];

        const headers = rows[0].map(h => String(h).trim().toLowerCase());
        const unidadeIndex = headers.indexOf("nm_unidade");
        const idFundoIndex = headers.indexOf("id_fundo");
        const fundoIndex = headers.indexOf("nm_fundo");
        const dtContratoIndex = headers.indexOf("dt_contrato");
        const dtCadastroIndex = headers.indexOf("dt_cadastro_fundo");
        const tipoServicoIndex = headers.indexOf("tp_servico");
        const instituicaoIndex = headers.indexOf("nm_instituicao");
        const dtBaileIndex = headers.indexOf("dt_baile");

        if (unidadeIndex === -1 || idFundoIndex === -1 || dtContratoIndex === -1) {
             console.error("Colunas essenciais (nm_unidade, id_fundo, dt_contrato) não foram encontradas na planilha FUNDOS.");
             return [];
        }

        // Função interna para converter datas no formato DD/MM/YYYY
        const parsePtBrDate = (dateString) => {
            if (!dateString || typeof dateString !== 'string') return null;
            const parts = dateString.split('/');
            if (parts.length === 3) {
                // Formato DD/MM/YYYY -> MM/DD/YYYY para o construtor Date
                return new Date(`${parts[1]}/${parts[0]}/${parts[2]}`);
            }
            return new Date(dateString); // Tenta o formato padrão
        };

        return rows.slice(1).map(row => {
            const dtContratoString = row[dtContratoIndex];
            if (!dtContratoString) return null; 
            
            const dtContrato = parsePtBrDate(dtContratoString);
            if (isNaN(dtContrato)) return null; // Pula a linha se a data do contrato for inválida

            return {
                nm_unidade: row[unidadeIndex] || 'N/A',
                id_fundo: row[idFundoIndex] || 'N/A',
                fundo: fundoIndex !== -1 ? row[fundoIndex] || 'N/A' : 'N/A',
                dt_contrato: dtContrato,
                dt_cadastro: dtCadastroIndex !== -1 ? parsePtBrDate(row[dtCadastroIndex]) : null,
                tipo_servico: tipoServicoIndex !== -1 ? row[tipoServicoIndex] || 'N/A' : 'N/A',
                instituicao: instituicaoIndex !== -1 ? row[instituicaoIndex] || 'N/A' : 'N/A',
                dt_baile: dtBaileIndex !== -1 ? parsePtBrDate(row[dtBaileIndex]) : null,
            };
        }).filter(Boolean);
    } catch (error) {
        console.error("Erro CRÍTICO ao buscar dados de fundos:", error);
        return [];
    }
}
    
    async function fetchMetasData() { if (!METAS_SPREADSHEET_ID || !METAS_SHEET_NAME || !API_KEY) { console.error("Configurações da planilha de metas incompletas."); return new Map(); } const url = `https://sheets.googleapis.com/v4/spreadsheets/${METAS_SPREADSHEET_ID}/values/${METAS_SHEET_NAME}?key=${API_KEY}`; try { const response = await fetch(url); if (!response.ok) { console.error("Erro API Google Sheets:", await response.json()); return new Map(); } const data = await response.json(); const rows = data.values || []; const metasMap = new Map(); const headers = rows[0].map(h => h.trim().toLowerCase()); const unidadeIndex = headers.indexOf("nm_unidade"), anoIndex = headers.indexOf("ano"), mesIndex = headers.indexOf("mês"), metaVendasIndex = headers.indexOf("meta vvr_venda"), metaPosvendasIndex = headers.indexOf("meta vvr_pos_venda"), metaAdesoesIndex = headers.indexOf("meta adesões"); rows.slice(1).forEach(row => { const unidade = row[unidadeIndex], ano = row[anoIndex], mes = String(row[mesIndex]).padStart(2, '0'); const parseMetaValue = (index) => parseFloat(String(row[index] || "0").replace(/\./g, '').replace(',', '.')) || 0; const metaVendas = parseMetaValue(metaVendasIndex), metaPosvendas = parseMetaValue(metaPosvendasIndex), metaAdesoes = parseInt(row[metaAdesoesIndex]) || 0; if (unidade && ano && mes) { const chave = `${unidade}-${ano}-${mes}`; metasMap.set(chave, { meta_vvr_vendas: metaVendas, meta_vvr_posvendas: metaPosvendas, meta_vvr_total: metaVendas + metaPosvendas, meta_adesoes: metaAdesoes }); } }); return metasMap; } catch (error) { console.error("Erro CRÍTICO ao buscar metas:", error); return new Map(); } }
    function processAndCrossReferenceData(salesData) { const vendasPorMesUnidade = salesData.reduce((acc, d) => { const year = d.dt_cadastro_integrante.getFullYear(); const month = String(d.dt_cadastro_integrante.getMonth() + 1).padStart(2, '0'); const periodo = `${year}-${month}`; const chave = `${d.nm_unidade}-${periodo}`; if (!acc[chave]) { acc[chave] = { unidade: d.nm_unidade, periodo: periodo, realizado_vvr: 0, realizado_adesoes: 0 }; } acc[chave].realizado_vvr += d.vl_plano; acc[chave].realizado_adesoes += 1; return acc; }, {}); return Object.values(vendasPorMesUnidade).map(item => { const chaveMeta = `${item.unidade}-${item.periodo}`; const meta = metasData.get(chaveMeta) || { meta_vvr_total: 0, meta_vvr_vendas: 0, meta_vvr_posvendas: 0, meta_adesoes: 0 }; return { ...item, ...meta }; }); }
    function updateMainKPIs(dataBruta, selectedUnidades, startDate, endDate) { const getColorForPercentage = (percent) => { if (percent >= 1) return '#28a745'; if (percent >= 0.5) return '#ffc107'; return '#dc3545'; }; const normalizeText = (text) => text?.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); const realizadoVendas = dataBruta.filter(d => normalizeText(d.venda_posvenda) === 'VENDA').reduce((sum, d) => sum + d.vl_plano, 0); const realizadoPosVendas = dataBruta.filter(d => normalizeText(d.venda_posvenda) === 'POS VENDA').reduce((sum, d) => sum + d.vl_plano, 0); const realizadoTotal = realizadoVendas + realizadoPosVendas; let metaVendas = 0; let metaPosVendas = 0; const unitsToConsider = selectedUnidades.length > 0 ? selectedUnidades : [...new Set(allData.map(d => d.nm_unidade))]; metasData.forEach((metaInfo, key) => { const [unidade, ano, mes] = key.split('-'); const metaDate = new Date(ano, parseInt(mes) - 1, 15); if (unitsToConsider.includes(unidade) && metaDate >= startDate && metaDate < endDate) { metaVendas += metaInfo.meta_vvr_vendas; metaPosVendas += metaInfo.meta_vvr_posvendas; } }); const metaTotal = metaVendas + metaPosVendas; const percentTotal = metaTotal > 0 ? realizadoTotal / metaTotal : 0; const percentVendas = metaVendas > 0 ? realizadoVendas / metaVendas : 0; const percentPosVendas = metaPosVendas > 0 ? realizadoPosVendas / metaPosVendas : 0; const totalColor = getColorForPercentage(percentTotal); document.getElementById('kpi-total-realizado').textContent = formatCurrency(realizadoTotal); document.getElementById('kpi-total-meta').textContent = formatCurrency(metaTotal); const totalPercentEl = document.getElementById('kpi-total-percent'); totalPercentEl.textContent = formatPercent(percentTotal); totalPercentEl.style.color = totalColor; document.getElementById('kpi-total-progress').style.backgroundColor = totalColor; document.getElementById('kpi-total-progress').style.width = `${Math.min(percentTotal * 100, 100)}%`; const vendasColor = getColorForPercentage(percentVendas); document.getElementById('kpi-vendas-realizado').textContent = formatCurrency(realizadoVendas); document.getElementById('kpi-vendas-meta').textContent = formatCurrency(metaVendas); const vendasPercentEl = document.getElementById('kpi-vendas-percent'); vendasPercentEl.textContent = formatPercent(percentVendas); vendasPercentEl.style.color = vendasColor; document.getElementById('kpi-vendas-progress').style.backgroundColor = vendasColor; document.getElementById('kpi-vendas-progress').style.width = `${Math.min(percentVendas * 100, 100)}%`; const posVendasColor = getColorForPercentage(percentPosVendas); document.getElementById('kpi-posvendas-realizado').textContent = formatCurrency(realizadoPosVendas); document.getElementById('kpi-posvendas-meta').textContent = formatCurrency(metaPosVendas); const posVendasPercentEl = document.getElementById('kpi-posvendas-percent'); posVendasPercentEl.textContent = formatPercent(percentPosVendas); posVendasPercentEl.style.color = posVendasColor; document.getElementById('kpi-posvendas-progress').style.backgroundColor = posVendasColor; document.getElementById('kpi-posvendas-progress').style.width = `${Math.min(percentPosVendas * 100, 100)}%`; }
    function updatePreviousYearKPIs(dataBruta, selectedUnidades, startDate, endDate) { const getColorForPercentage = (percent) => { if (percent >= 1) return '#28a745'; if (percent >= 0.5) return '#ffc107'; return '#dc3545'; }; const normalizeText = (text) => text?.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); const realizadoVendas = dataBruta.filter(d => normalizeText(d.venda_posvenda) === 'VENDA').reduce((sum, d) => sum + d.vl_plano, 0); const realizadoPosVendas = dataBruta.filter(d => normalizeText(d.venda_posvenda) === 'POS VENDA').reduce((sum, d) => sum + d.vl_plano, 0); const realizadoTotal = realizadoVendas + realizadoPosVendas; let metaVendas = 0; let metaPosVendas = 0; const unitsToConsider = selectedUnidades.length > 0 ? selectedUnidades : [...new Set(allData.map(d => d.nm_unidade))]; metasData.forEach((metaInfo, key) => { const [unidade, ano, mes] = key.split('-'); const metaDate = new Date(ano, parseInt(mes) - 1, 15); if (unitsToConsider.includes(unidade) && metaDate >= startDate && metaDate < endDate) { metaVendas += metaInfo.meta_vvr_vendas; metaPosVendas += metaInfo.meta_vvr_posvendas; } }); const metaTotal = metaVendas + metaPosVendas; const percentTotal = metaTotal > 0 ? realizadoTotal / metaTotal : 0; const percentVendas = metaVendas > 0 ? realizadoVendas / metaVendas : 0; const percentPosVendas = metaPosVendas > 0 ? realizadoPosVendas / metaPosVendas : 0; const totalColor = getColorForPercentage(percentTotal); document.getElementById('kpi-total-realizado-py').textContent = formatCurrency(realizadoTotal); document.getElementById('kpi-total-meta-py').textContent = formatCurrency(metaTotal); const totalPercentEl = document.getElementById('kpi-total-percent-py'); totalPercentEl.textContent = formatPercent(percentTotal); totalPercentEl.style.color = totalColor; document.getElementById('kpi-total-progress-py').style.backgroundColor = totalColor; document.getElementById('kpi-total-progress-py').style.width = `${Math.min(percentTotal * 100, 100)}%`; const vendasColor = getColorForPercentage(percentVendas); document.getElementById('kpi-vendas-realizado-py').textContent = formatCurrency(realizadoVendas); document.getElementById('kpi-vendas-meta-py').textContent = formatCurrency(metaVendas); const vendasPercentEl = document.getElementById('kpi-vendas-percent-py'); vendasPercentEl.textContent = formatPercent(percentVendas); vendasPercentEl.style.color = vendasColor; document.getElementById('kpi-vendas-progress-py').style.backgroundColor = vendasColor; document.getElementById('kpi-vendas-progress-py').style.width = `${Math.min(percentVendas * 100, 100)}%`; const posVendasColor = getColorForPercentage(percentPosVendas); document.getElementById('kpi-posvendas-realizado-py').textContent = formatCurrency(realizadoPosVendas); document.getElementById('kpi-posvendas-meta-py').textContent = formatCurrency(metaPosVendas); const posVendasPercentEl = document.getElementById('kpi-posvendas-percent-py'); posVendasPercentEl.textContent = formatPercent(percentPosVendas); posVendasPercentEl.style.color = posVendasColor; document.getElementById('kpi-posvendas-progress-py').style.backgroundColor = posVendasColor; document.getElementById('kpi-posvendas-progress-py').style.width = `${Math.min(percentPosVendas * 100, 100)}%`; }

    function updateDashboard() {
        const selectedUnidades = $('#unidade-filter').val() || [];
        const anoVigente = 2025;
        const dataParaGrafico = allData.filter(d => (selectedUnidades.length === 0 || selectedUnidades.includes(d.nm_unidade)) && d.dt_cadastro_integrante.getFullYear() === anoVigente);
        
        const startDateString = document.getElementById('start-date').value;
        const startParts = startDateString.split('-');
        const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);
        const endDateString = document.getElementById('end-date').value;
        const endParts = endDateString.split('-');
        const endDate = new Date(endParts[0], endParts[1] - 1, endParts[2]);
        endDate.setDate(endDate.getDate() + 1);
        
        const dataBrutaFiltrada = allData.filter(d => (selectedUnidades.length === 0 || selectedUnidades.includes(d.nm_unidade)) && d.dt_cadastro_integrante >= startDate && d.dt_cadastro_integrante < endDate);
        
        updateVvrVsMetaPorMesChart(dataParaGrafico, anoVigente);
        updateCumulativeVvrChart(allData, selectedUnidades);
        updateMonthlyVvrChart(allData, selectedUnidades);
        updateDrillDownCharts(allData, selectedUnidades);
        updateTicketCharts(allData, selectedUnidades);
        updateContractsCharts(fundosData, selectedUnidades);
        updateMonthlyAdesoesChart(allData, selectedUnidades);
        updateAdesoesDrillDownCharts(allData, selectedUnidades);
        updateConsultorTable(dataBrutaFiltrada);
        updateDetalhadaAdesoesTable(dataBrutaFiltrada);
updateFundosDetalhadosTable(fundosData, selectedUnidades, startDate, endDate);
        updateMainKPIs(dataBrutaFiltrada, selectedUnidades, startDate, endDate);

        const dataAgregadaComVendas = processAndCrossReferenceData(dataBrutaFiltrada);
        const combinedDataMap = new Map();
        dataAgregadaComVendas.forEach(item => { const key = `${item.unidade}-${item.periodo}`; combinedDataMap.set(key, item); });
        const unitsToConsider = selectedUnidades.length > 0 ? selectedUnidades : [...new Set(allData.map(d => d.nm_unidade))];
        metasData.forEach((metaInfo, key) => {
            const [unidade, ano, mes] = key.split('-');
            const metaDate = new Date(ano, parseInt(mes) - 1, 15);
            const periodo = `${ano}-${mes}`;
            const mapKey = `${unidade}-${periodo}`;
            if (unitsToConsider.includes(unidade) && metaDate >= startDate && metaDate < endDate && !combinedDataMap.has(mapKey)) {
                combinedDataMap.set(mapKey, { unidade: unidade, periodo: periodo, realizado_vvr: 0, realizado_adesoes: 0, ...metaInfo });
            }
        });
        const finalTableData = Array.from(combinedDataMap.values());
        currentFilteredDataForTable = finalTableData;
        updateDataTable(finalTableData);
        const startDatePY = new Date(startDate);
        startDatePY.setFullYear(startDatePY.getFullYear() - 1);
        const endDatePY = new Date(endDate);
        endDatePY.setFullYear(endDatePY.getFullYear() - 1);
        const dataBrutaFiltradaPY = allData.filter(d => (selectedUnidades.length === 0 || selectedUnidades.includes(d.nm_unidade)) && d.dt_cadastro_integrante >= startDatePY && d.dt_cadastro_integrante < endDatePY);
        document.getElementById('kpi-section-py').style.display = 'block';
        updatePreviousYearKPIs(dataBrutaFiltradaPY, selectedUnidades, startDatePY, endDatePY);
    }
    
    function updateVvrVsMetaPorMesChart(salesDataForYear, anoVigente) { const allYearPeriodos = Array.from({ length: 12 }, (_, i) => `${anoVigente}-${String(i + 1).padStart(2, '0')}`); const chartDataMap = new Map(); allYearPeriodos.forEach(periodo => { chartDataMap.set(periodo, { realizado_vendas: 0, realizado_posvendas: 0, meta_vendas: 0, meta_posvendas: 0, meta_total: 0 }); }); const normalizeText = (text) => text?.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); salesDataForYear.forEach(d => { const year = d.dt_cadastro_integrante.getFullYear(); const month = String(d.dt_cadastro_integrante.getMonth() + 1).padStart(2, '0'); const periodo = `${year}-${month}`; if (chartDataMap.has(periodo)) { if (normalizeText(d.venda_posvenda) === 'VENDA') { chartDataMap.get(periodo).realizado_vendas += d.vl_plano; } else if (normalizeText(d.venda_posvenda) === 'POS VENDA') { chartDataMap.get(periodo).realizado_posvendas += d.vl_plano; } } }); const selectedUnidades = $('#unidade-filter').val() || [...new Set(allData.map(d => d.nm_unidade))]; metasData.forEach((metaInfo, key) => { const [unidade, ano, mes] = key.split('-'); const periodo = `${ano}-${mes}`; if (ano == anoVigente && chartDataMap.has(periodo)) { if (selectedUnidades.length === 0 || selectedUnidades.includes(unidade)) { chartDataMap.get(periodo).meta_vendas += metaInfo.meta_vvr_vendas; chartDataMap.get(periodo).meta_posvendas += metaInfo.meta_vvr_posvendas; chartDataMap.get(periodo).meta_total += metaInfo.meta_vvr_total; } } }); let realizadoValues, metaValues; if (currentVvrChartType === 'vendas') { realizadoValues = allYearPeriodos.map(p => chartDataMap.get(p).realizado_vendas); metaValues = allYearPeriodos.map(p => chartDataMap.get(p).meta_vendas); } else if (currentVvrChartType === 'posvendas') { realizadoValues = allYearPeriodos.map(p => chartDataMap.get(p).realizado_posvendas); metaValues = allYearPeriodos.map(p => chartDataMap.get(p).meta_posvendas); } else { realizadoValues = allYearPeriodos.map(p => chartDataMap.get(p).realizado_vendas + chartDataMap.get(p).realizado_posvendas); metaValues = allYearPeriodos.map(p => chartDataMap.get(p).meta_total); } const formattedLabels = allYearPeriodos.map(periodo => { const [year, month] = periodo.split('-'); const date = new Date(year, month - 1); const monthName = date.toLocaleString('pt-BR', { month: 'short' }).replace('.', ''); const shortYear = year.slice(2); return `${monthName}-${shortYear}`; }); if (vvrVsMetaPorMesChart) vvrVsMetaPorMesChart.destroy(); Chart.register(ChartDataLabels); vvrVsMetaPorMesChart = new Chart(document.getElementById('vvrVsMetaPorMesChart'), { type: 'bar', data: { labels: formattedLabels, datasets: [ { label: 'VVR Realizado', data: realizadoValues, backgroundColor: 'rgba(255, 193, 7, 0.7)', order: 1 }, { label: 'Meta VVR', data: metaValues, type: 'line', borderColor: 'rgb(220, 53, 69)', order: 0, datalabels: { display: true, align: 'bottom', backgroundColor: 'rgba(0, 0, 0, 0.6)', borderRadius: 4, color: 'white', font: { size: 15 }, padding: 4, formatter: (value) => (value > 0 ? `${(value / 1000).toFixed(0)}k` : '') } } ] }, options: { 
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false, }, plugins: { datalabels: { anchor: 'end', align: 'end', formatter: (value) => (value >= 1000 ? `${(value / 1000).toFixed(0)}k` : ''), color: '#F8F9FA', font: { weight: 'bold' } }, tooltip: { callbacks: { label: function(context) { let label = context.dataset.label || ''; if (label) { label += ': '; } if (context.parsed.y !== null) { label += formatCurrency(context.parsed.y); } return label; } } } }, scales: { y: { beginAtZero: true } } } }); }
    function updateCumulativeVvrChart(historicalData, selectedUnidades) { const selectorContainer = document.getElementById('cumulative-chart-selector'); const unitsToConsider = selectedUnidades.length > 0 ? selectedUnidades : [...new Set(allData.map(d => d.nm_unidade))]; const filteredHistoricalData = historicalData.filter(d => unitsToConsider.includes(d.nm_unidade)); const salesByYearMonth = {}; const uniqueYears = [...new Set(filteredHistoricalData.map(d => d.dt_cadastro_integrante.getFullYear()))].sort(); if (selectorContainer.children.length === 0) { uniqueYears.forEach(year => { const button = document.createElement('button'); button.dataset.year = year; button.textContent = year; if (year >= uniqueYears[uniqueYears.length - 2]) { button.classList.add('active'); } selectorContainer.appendChild(button); }); selectorContainer.querySelectorAll('button').forEach(button => { button.addEventListener('click', () => { button.classList.toggle('active'); updateDashboard(); }); }); } const activeYears = Array.from(selectorContainer.querySelectorAll('button.active')).map(btn => parseInt(btn.dataset.year)); filteredHistoricalData.forEach(d => { const year = d.dt_cadastro_integrante.getFullYear(); const month = d.dt_cadastro_integrante.getMonth(); if (!salesByYearMonth[year]) { salesByYearMonth[year] = Array(12).fill(0); } salesByYearMonth[year][month] += d.vl_plano; }); const colors = ['#ffc107', '#007bff', '#6c757d', '#28a745', '#dc3545', '#17a2b8', '#fd7e14']; const datasets = []; uniqueYears.forEach((year, index) => { const monthlyData = salesByYearMonth[year] || Array(12).fill(0); const cumulativeData = []; let runningTotal = 0; for (let i = 0; i < 12; i++) { runningTotal += monthlyData[i]; cumulativeData.push(runningTotal); } datasets.push({ label: year, data: cumulativeData, borderColor: colors[index % colors.length], fill: false, tension: 0.1, hidden: !activeYears.includes(year) }); }); const monthLabels = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']; if (cumulativeVvrChart) cumulativeVvrChart.destroy(); cumulativeVvrChart = new Chart(document.getElementById('cumulativeVvrChart'), { type: 'line', data: { labels: monthLabels, datasets: datasets }, options: { 
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false, }, plugins: { tooltip: { callbacks: { label: function(context) { let label = context.dataset.label || ''; if (label) { label += ': '; } if (context.parsed.y !== null) { label += formatCurrency(context.parsed.y); } return label; } } }, datalabels: { display: true, align: 'top', offset: 8, backgroundColor: 'rgba(52, 58, 64, 0.7)', borderRadius: 4, color: 'white', font: { size: 14 }, padding: 4, formatter: (value) => { if (value > 0) { if (value >= 1000000) return `${(value / 1000000).toFixed(1)} mi`; if (value >= 1000) return `${(value / 1000).toFixed(0)}k`; return value.toFixed(0); } return ''; } } }, scales: { y: { beginAtZero: true } } } }); }
    function updateMonthlyVvrChart(historicalData, selectedUnidades) { const selectorContainer = document.getElementById('monthly-chart-selector'); const unitsToConsider = selectedUnidades.length > 0 ? selectedUnidades : [...new Set(allData.map(d => d.nm_unidade))]; const filteredHistoricalData = historicalData.filter(d => unitsToConsider.includes(d.nm_unidade)); const salesByYearMonth = {}; const uniqueYears = [...new Set(filteredHistoricalData.map(d => d.dt_cadastro_integrante.getFullYear()))].sort(); if (selectorContainer.children.length === 0) { uniqueYears.forEach(year => { const button = document.createElement('button'); button.dataset.year = year; button.textContent = year; if (year >= uniqueYears[uniqueYears.length - 2]) { button.classList.add('active'); } selectorContainer.appendChild(button); }); selectorContainer.querySelectorAll('button').forEach(button => { button.addEventListener('click', () => { button.classList.toggle('active'); updateDashboard(); }); }); } const activeYears = Array.from(selectorContainer.querySelectorAll('button.active')).map(btn => parseInt(btn.dataset.year)); filteredHistoricalData.forEach(d => { const year = d.dt_cadastro_integrante.getFullYear(); const month = d.dt_cadastro_integrante.getMonth(); if (!salesByYearMonth[year]) { salesByYearMonth[year] = Array(12).fill(0); } salesByYearMonth[year][month] += d.vl_plano; }); const colors = ['#ffc107', '#007bff', '#6c757d', '#28a745', '#dc3545', '#17a2b8', '#fd7e14']; const datasets = []; uniqueYears.forEach((year, index) => { const monthlyData = salesByYearMonth[year] || Array(12).fill(0); datasets.push({ label: year, data: monthlyData, borderColor: colors[index % colors.length], backgroundColor: colors[index % colors.length] + '33', fill: true, tension: 0.1, hidden: !activeYears.includes(year) }); }); const monthLabels = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']; if (monthlyVvrChart) monthlyVvrChart.destroy(); monthlyVvrChart = new Chart(document.getElementById('monthlyVvrChart'), { type: 'line', data: { labels: monthLabels, datasets: datasets }, options: { 
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false }, plugins: { tooltip: { callbacks: { label: function(context) { let label = context.dataset.label || ''; if (label) { label += ': '; } if (context.parsed.y !== null) { label += formatCurrency(context.parsed.y); } return label; } } }, datalabels: { display: true, align: 'top', offset: 8, backgroundColor: 'rgba(52, 58, 64, 0.7)', borderRadius: 4, color: 'white', font: { size: 14 }, padding: 4, formatter: (value) => { if (value > 0) { if (value >= 1000000) return `${(value / 1000000).toFixed(1)} mi`; if (value >= 1000) return `${(value / 1000).toFixed(0)}k`; return value.toFixed(0); } return ''; } } }, scales: { y: { beginAtZero: true } } } }); }
    
function updateDrillDownCharts(historicalData, selectedUnidades) {
    const unitsToConsider = selectedUnidades.length > 0 ? selectedUnidades : [...new Set(allData.map(d => d.nm_unidade))];
    const filteredHistoricalData = historicalData.filter(d => unitsToConsider.includes(d.nm_unidade));
    const normalizeText = (text) => text?.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const salesByYear = {};
    filteredHistoricalData.forEach(d => {
        const year = d.dt_cadastro_integrante.getFullYear();
        if (!salesByYear[year]) {
            salesByYear[year] = { vendas: 0, posVendas: 0 };
        }
        if (normalizeText(d.venda_posvenda) === 'VENDA') {
            salesByYear[year].vendas += d.vl_plano;
        } else if (normalizeText(d.venda_posvenda) === 'POS VENDA') {
            salesByYear[year].posVendas += d.vl_plano;
        }
    });

    const years = Object.keys(salesByYear).sort();
    const vendasAnual = years.map(year => salesByYear[year].vendas);
    const posVendasAnual = years.map(year => salesByYear[year].posVendas);

    if (yearlyStackedChart) yearlyStackedChart.destroy();
    yearlyStackedChart = new Chart(document.getElementById('yearlyStackedChart'), {
        type: 'bar',
        data: {
            labels: years,
            datasets: [
                { label: 'Pós Venda', data: posVendasAnual, backgroundColor: '#007bff' },
                { label: 'Venda', data: vendasAnual, backgroundColor: '#6c757d' }
            ]
        },
        options: {
            // --- AJUSTE ADICIONADO AQUI ---
            devicePixelRatio: window.devicePixelRatio,

            maintainAspectRatio: false,
            indexAxis: 'y',
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: { stacked: true },
                y: { stacked: true }
            },
            plugins: {
                datalabels: {
                    color: 'white',
                    font: { weight: 'bold' },
                    formatter: function(value) {
                        if (value === 0) {
                            return '';
                        }
                        if (value >= 1000000) {
                            return (value / 1000000).toFixed(1).replace('.0', '') + ' M';
                        }
                        if (value >= 1000) {
                            return (value / 1000).toFixed(1).replace('.0', '') + 'k';
                        }
                        return value;
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) { let label = context.dataset.label || ''; if (label) { label += ': '; } if (context.parsed.x !== null) { label += formatCurrency(context.parsed.x); } return label; },
                        footer: function (tooltipItems) { let sum = 0; tooltipItems.forEach(item => { sum += item.parsed.x; }); return 'Total: ' + formatCurrency(sum); }
                    }
                }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const clickedYear = years[elements[0].index];
                    drawMonthlyDetailChart(filteredHistoricalData, clickedYear);
                }
            }
        }
    });

    if (years.length > 0) {
        drawMonthlyDetailChart(filteredHistoricalData, years[years.length - 1]);
    }
}

  function drawMonthlyDetailChart(data, year) {
    document.getElementById('monthly-stacked-title').textContent = `Venda Realizada Total Mensal (${year})`;
    const salesByMonth = Array(12).fill(0).map(() => ({ vendas: 0, posVendas: 0 }));
    const normalizeText = (text) => text?.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    data.forEach(d => {
        if (d.dt_cadastro_integrante.getFullYear() === parseInt(year)) {
            const month = d.dt_cadastro_integrante.getMonth();
            if (normalizeText(d.venda_posvenda) === 'VENDA') {
                salesByMonth[month].vendas += d.vl_plano;
            } else if (normalizeText(d.venda_posvenda) === 'POS VENDA') {
                salesByMonth[month].posVendas += d.vl_plano;
            }
        }
    });

    const vendasMensal = salesByMonth.map(m => m.vendas);
    const posVendasMensal = salesByMonth.map(m => m.posVendas);
    const monthLabels = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

    if (monthlyStackedChart) monthlyStackedChart.destroy();
    monthlyStackedChart = new Chart(document.getElementById('monthlyStackedChart'), {
        type: 'bar',
        data: {
            labels: monthLabels,
            datasets: [
                { label: 'Pós Venda', data: posVendasMensal, backgroundColor: '#007bff' },
                { label: 'Venda', data: vendasMensal, backgroundColor: '#6c757d' }
            ]
        },
        options: {
            // --- CORREÇÃO ADICIONADA AQUI ---
            devicePixelRatio: window.devicePixelRatio,

            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: { x: { stacked: true }, y: { stacked: true } },
            plugins: {
                datalabels: {
                    color: 'white',
                    font: { weight: 'bold' },
                    formatter: function(value) {
                        if (value === 0) return '';
                        if (value >= 1000000) {
                            return (value / 1000000).toFixed(1).replace('.0', '') + ' M';
                        }
                        if (value >= 1000) {
                            return (value / 1000).toFixed(0) + 'k';
                        }
                        return value;
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) { let label = context.dataset.label || ''; if (label) { label += ': '; } if (context.parsed.y !== null) { label += formatCurrency(context.parsed.y); } return label; },
                        footer: function (tooltipItems) { let sum = 0; tooltipItems.forEach(item => { sum += item.parsed.y; }); return 'Total: ' + formatCurrency(sum); }
                    }
                }
            }
        }
    });
}
    function updateTicketCharts(historicalData, selectedUnidades) {
        const unitsToConsider = selectedUnidades.length > 0 ? selectedUnidades : [...new Set(allData.map(d => d.nm_unidade))];
        const filteredHistoricalData = historicalData.filter(d => unitsToConsider.includes(d.nm_unidade));

        const ticketByYear = {};
        filteredHistoricalData.forEach(d => {
            const year = d.dt_cadastro_integrante.getFullYear();
            if (!ticketByYear[year]) {
                ticketByYear[year] = { totalValor: 0, totalAdesoes: 0 };
            }
            ticketByYear[year].totalValor += d.vl_plano;
            ticketByYear[year].totalAdesoes += 1;
        });

        const years = Object.keys(ticketByYear).sort();
        const annualTicketData = years.map(year => {
            const data = ticketByYear[year];
            return data.totalAdesoes > 0 ? data.totalValor / data.totalAdesoes : 0;
        });

        if (yearlyTicketChart) yearlyTicketChart.destroy();
        yearlyTicketChart = new Chart(document.getElementById('yearlyTicketChart'), {
            type: 'bar',
            data: {
                labels: years,
                datasets: [{
                    label: 'Ticket Médio',
                    data: annualTicketData,
                    backgroundColor: '#17a2b8'
                }]
            },
         options: {
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
        datalabels: {
            anchor: 'end',
            align: 'end',
            color: 'white',
            font: { weight: 'bold' },
            formatter: (value) => value > 0 ? formatCurrency(value) : ''
        },
        tooltip: {
            callbacks: {
                label: (context) => `Ticket Médio: ${formatCurrency(context.parsed.x)}`
            }
        }
    },
    scales: { // Adicionamos a configuração de escalas
        x: {
            beginAtZero: true,
            // Lógica para adicionar espaço extra no eixo X (horizontal)
            afterDataLimits: (scale) => {
                scale.max *= 1.2;
            }
        }
    },
    onClick: (event, elements) => {
        if (elements.length > 0) {
            const clickedYear = years[elements[0].index];
            drawMonthlyTicketChart(filteredHistoricalData, clickedYear);
        }
    }
}
        });

        if (years.length > 0) {
            drawMonthlyTicketChart(filteredHistoricalData, years[years.length - 1]);
        }
    }

function drawMonthlyTicketChart(data, year) {
    document.getElementById('monthly-ticket-title').textContent = `Ticket Médio Mensal (${year})`;
    
    const ticketByMonth = Array(12).fill(0).map(() => ({ totalValor: 0, totalAdesoes: 0 }));

    data.forEach(d => {
        if (d.dt_cadastro_integrante.getFullYear() === parseInt(year)) {
            const month = d.dt_cadastro_integrante.getMonth();
            ticketByMonth[month].totalValor += d.vl_plano;
            ticketByMonth[month].totalAdesoes += 1;
        }
    });
    
    const monthlyTicketData = ticketByMonth.map(m => m.totalAdesoes > 0 ? m.totalValor / m.totalAdesoes : 0);
    const monthLabels = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

    // 1. Encontra o valor máximo nos dados do gráfico
    const maxValue = Math.max(...monthlyTicketData);

    if (monthlyTicketChart) monthlyTicketChart.destroy();
    monthlyTicketChart = new Chart(document.getElementById('monthlyTicketChart'), {
        type: 'bar',
        data: {
            labels: monthLabels,
            datasets: [{
                label: 'Ticket Médio',
                data: monthlyTicketData,
                backgroundColor: '#17a2b8'
            }]
        },
        options: {
            maintainAspectRatio: false,
            plugins: {
                datalabels: {
                    anchor: 'end',
                    align: 'end',
                    color: 'white',
                    font: { weight: 'bold' },
                    formatter: (value) => value > 0 ? formatCurrency(value) : '' // Formata apenas valores maiores que zero
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `Ticket Médio: ${formatCurrency(context.parsed.y)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    // 2. Define o valor máximo do eixo Y com uma folga de 20%
                    // Se o valor máximo for 0, o gráfico se ajusta automaticamente
                    max: maxValue > 0 ? maxValue * 1.20 : undefined 
                }
            }
        }
    });
}
    
    function updateContractsCharts(historicalData, selectedUnidades) {
        const unitsToConsider = selectedUnidades.length > 0 ? selectedUnidades : [...new Set(allData.map(d => d.nm_unidade))];
        const filteredHistoricalData = historicalData.filter(d => unitsToConsider.includes(d.nm_unidade));

        const contractsByYear = {};
        filteredHistoricalData.forEach(d => {
            const year = d.dt_contrato.getFullYear();
            if (!contractsByYear[year]) {
                contractsByYear[year] = 0;
            }
            contractsByYear[year]++;
        });

        const years = Object.keys(contractsByYear)
                            .sort()
                            .filter(year => parseInt(year) >= 2019);
        const annualContractsData = years.map(year => contractsByYear[year]);

        if (yearlyContractsChart) yearlyContractsChart.destroy();
        yearlyContractsChart = new Chart(document.getElementById('yearlyContractsChart'), {
            type: 'bar',
            data: {
                labels: years,
                datasets: [{
                    label: 'Contratos',
                    data: annualContractsData,
                    backgroundColor: '#28a745'
                }]
            },
            options: {
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    datalabels: {
                        anchor: 'end',
                        align: 'end',
                        color: 'white',
                        font: { weight: 'bold' },
                        formatter: (value) => value.toLocaleString('pt-BR')
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `Contratos: ${context.parsed.x.toLocaleString('pt-BR')}`
                        }
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const clickedYear = years[elements[0].index];
                        drawMonthlyContractsChart(filteredHistoricalData, clickedYear);
                    }
                }
            }
        });

        if (years.length > 0) {
            drawMonthlyContractsChart(filteredHistoricalData, years[years.length - 1]);
        }
    }

    function drawMonthlyContractsChart(data, year) {
        document.getElementById('monthly-contracts-title').textContent = `Contratos Realizados Total Mensal (${year})`;
        
        const contractsByMonth = Array(12).fill(0);

        data.forEach(d => {
            if (d.dt_contrato.getFullYear() === parseInt(year)) {
                const month = d.dt_contrato.getMonth();
                contractsByMonth[month]++;
            }
        });
        
        const monthLabels = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

        if (monthlyContractsChart) monthlyContractsChart.destroy();
        monthlyContractsChart = new Chart(document.getElementById('monthlyContractsChart'), {
            type: 'bar',
            data: {
                labels: monthLabels,
                datasets: [{
                    label: 'Contratos',
                    data: contractsByMonth,
                    backgroundColor: '#28a745'
                }]
            },
            options: {
                maintainAspectRatio: false,
                plugins: {
                    datalabels: {
                        anchor: 'end',
                        align: 'end',
                        color: 'white',
                        font: { weight: 'bold' },
                        formatter: (value) => value > 0 ? value.toLocaleString('pt-BR') : ''
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `Contratos: ${context.parsed.y.toLocaleString('pt-BR')}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function updateDataTable(data) { const tableData = data.map(d => { const normalizeText = (text) => text?.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); let realizado = 0; let meta = 0; const vendasDoPeriodo = allData.filter(v => v.nm_unidade === d.unidade && `${v.dt_cadastro_integrante.getFullYear()}-${String(v.dt_cadastro_integrante.getMonth() + 1).padStart(2, '0')}` === d.periodo); if (currentTableDataType === 'vendas') { realizado = vendasDoPeriodo.filter(v => normalizeText(v.venda_posvenda) === 'VENDA').reduce((sum, v) => sum + v.vl_plano, 0); meta = d.meta_vvr_vendas; } else if (currentTableDataType === 'posvendas') { realizado = vendasDoPeriodo.filter(v => normalizeText(v.venda_posvenda) === 'POS VENDA').reduce((sum, v) => sum + v.vl_plano, 0); meta = d.meta_vvr_posvendas; } else { realizado = d.realizado_vvr; meta = d.meta_vvr_total; } const atingimentoVvr = meta > 0 ? realizado / meta : 0; return [ d.unidade, d.periodo, formatCurrency(realizado), formatCurrency(meta), formatPercent(atingimentoVvr) ]; }).sort((a,b) => String(a[1]).localeCompare(String(b[0]))); if (dataTable) { dataTable.clear().rows.add(tableData).draw(); } else { dataTable = $('#dados-table').DataTable({ data: tableData, pageLength: 10, language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/pt-BR.json' }, destroy: true, dom: 'Bfrtip', buttons: [ { extend: 'excelHtml5', text: 'Exportar para Excel', title: `Relatorio_Vendas_${new Date().toLocaleDateString('pt-BR')}`, className: 'excel-button', exportOptions: { format: { body: function ( data, row, column, node ) { if (column === 2 || column === 3) { return parseFloat(data.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()); } if (column === 4) { return parseFloat(data.replace('%', '').replace(',', '.').trim()) / 100; } return data; } } } } ] }); } }
    
    function addEventListeners() { 
        document.getElementById('start-date').addEventListener('change', updateDashboard); 
        document.getElementById('end-date').addEventListener('change', updateDashboard); 
        
        document.querySelectorAll('.page-navigation button').forEach(button => {
            button.addEventListener('click', function() {
                document.querySelectorAll('.page-navigation button').forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                document.querySelectorAll('.page-content').forEach(page => page.classList.remove('active'));
                document.getElementById(this.dataset.page).classList.add('active');
            });
        });

        document.querySelectorAll('#chart-vvr-mes-section .chart-selector button').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('#chart-vvr-mes-section .chart-selector button').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                currentVvrChartType = button.dataset.type;
                updateDashboard();
            });
        });
        document.querySelectorAll('#table-section .chart-selector button').forEach(button => {
            button.addEventListener('click', () => {
                const scrollPosition = window.scrollY;
                document.querySelectorAll('#table-section .chart-selector button').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                currentTableDataType = button.dataset.type;
                updateDataTable(currentFilteredDataForTable);
                window.scrollTo(0, scrollPosition);
            });
        });
    }
    
    function populateFilters() { 
        const unidadesVendas = allData.map(d => d.nm_unidade);
        const unidadesFundos = fundosData.map(d => d.nm_unidade);
        const unidades = [...new Set([...unidadesVendas, ...unidadesFundos])].sort();
        const unidadeFilter = $('#unidade-filter'); 
        unidadeFilter.empty(); 
        unidades.forEach(u => { unidadeFilter.append($('<option>', { value: u, text: u })); }); 
        unidadeFilter.multiselect({ 
            enableFiltering: true, 
            includeSelectAllOption: true, 
            selectAllText: 'Marcar todos', 
            filterPlaceholder: 'Pesquisar...', 
            nonSelectedText: 'Todas as unidades', 
            nSelectedText: 'unidades', 
            allSelectedText: 'Todas selecionadas', 
            buttonWidth: '100%', 
            maxHeight: 300,
            onChange: function(option, checked) {
                updateDashboard();
            },
            onSelectAll: function() {
                updateDashboard();
            },
            onDeselectAll: function() {
                updateDashboard();
            }
        }); 
        const hoje = new Date(); 
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1); 
        const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0); 
        document.getElementById('start-date').value = inicioMes.toISOString().split('T')[0]; 
        document.getElementById('end-date').value = fimMes.toISOString().split('T')[0]; 
    }

    function updateMonthlyAdesoesChart(historicalData, selectedUnidades) {
        const selectorContainer = document.getElementById('adesoes-chart-selector');
        const unitsToConsider = selectedUnidades.length > 0 ? selectedUnidades : [...new Set(allData.map(d => d.nm_unidade))];
        const filteredHistoricalData = historicalData.filter(d => unitsToConsider.includes(d.nm_unidade));

        const adesoesByYearMonth = {};
        filteredHistoricalData.forEach(d => {
            const year = d.dt_cadastro_integrante.getFullYear();
            const month = d.dt_cadastro_integrante.getMonth();
            if (!adesoesByYearMonth[year]) {
                adesoesByYearMonth[year] = Array(12).fill(0);
            }
            adesoesByYearMonth[year][month]++; 
        });

        const uniqueYears = Object.keys(adesoesByYearMonth).sort();

        if (selectorContainer.children.length === 0) {
            uniqueYears.forEach(year => {
                const button = document.createElement('button');
                button.dataset.year = year;
                button.textContent = year;
                if (year >= uniqueYears[uniqueYears.length - 2]) {
                    button.classList.add('active');
                }
                selectorContainer.appendChild(button);
            });

            selectorContainer.querySelectorAll('button').forEach(button => {
                button.addEventListener('click', () => {
                    button.classList.toggle('active');
                    updateDashboard();
                });
            });
        }

        const activeYears = Array.from(selectorContainer.querySelectorAll('button.active')).map(btn => parseInt(btn.dataset.year));
        const colors = ['#6c757d', '#28a745', '#dc3545', '#ffc107', '#007bff', '#17a2b8', '#fd7e14'];

        const datasets = [];
        uniqueYears.forEach((year, index) => {
            const monthlyData = adesoesByYearMonth[year] || Array(12).fill(0);
            datasets.push({
                label: year,
                data: monthlyData,
                backgroundColor: colors[index % colors.length],
                hidden: !activeYears.includes(parseInt(year))
            });
        });

        const monthLabels = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

        if (monthlyAdesoesChart) monthlyAdesoesChart.destroy();
        monthlyAdesoesChart = new Chart(document.getElementById('monthlyAdesoesChart'), {
            type: 'bar',
            data: {
                labels: monthLabels,
                datasets: datasets
            },
            options: {
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y;
                                }
                                return label;
                            }
                        }
                    },
                    datalabels: {
                        display: true,
                        align: 'center',
                        anchor: 'center',
                        color: '#FFFFFF',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        formatter: (value) => value > 0 ? value : ''
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                           callback: function(value) {
                               if (value >= 1000) {
                                   return (value / 1000) + ' mil';
                               }
                               return value;
                           }
                        }
                    }
                }
            }
        });
    }

    function updateAdesoesDrillDownCharts(historicalData, selectedUnidades) {
    const unitsToConsider = selectedUnidades.length > 0 ? selectedUnidades : [...new Set(allData.map(d => d.nm_unidade))];
    const filteredHistoricalData = historicalData.filter(d => unitsToConsider.includes(d.nm_unidade));
    const normalizeText = (text) => text?.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const adesoesByYear = {};
    filteredHistoricalData.forEach(d => {
        const year = d.dt_cadastro_integrante.getFullYear();
        if (!adesoesByYear[year]) {
            adesoesByYear[year] = { vendas: 0, posVendas: 0 };
        }
        if (normalizeText(d.venda_posvenda) === 'VENDA') {
            adesoesByYear[year].vendas++;
        } else if (normalizeText(d.venda_posvenda) === 'POS VENDA') {
            adesoesByYear[year].posVendas++;
        }
    });

    const years = Object.keys(adesoesByYear).sort();
    const adesoesVendasAnual = years.map(year => adesoesByYear[year].vendas);
    const adesoesPosVendasAnual = years.map(year => adesoesByYear[year].posVendas);

    if (yearlyAdesoesStackedChart) yearlyAdesoesStackedChart.destroy();
    yearlyAdesoesStackedChart = new Chart(document.getElementById('yearlyAdesoesStackedChart'), {
        type: 'bar',
        data: {
            labels: years,
            datasets: [
                { label: 'Pós Venda', data: adesoesPosVendasAnual, backgroundColor: '#007bff' },
                { label: 'Venda', data: adesoesVendasAnual, backgroundColor: '#6c757d' }
            ]
        },
        options: {
            // AJUSTES ADICIONADOS AQUI
            devicePixelRatio: window.devicePixelRatio,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            // FIM DOS AJUSTES

            maintainAspectRatio: false,
            indexAxis: 'y',
            scales: { x: { stacked: true }, y: { stacked: true } },
            plugins: {
                datalabels: { color: 'white', font: { weight: 'bold' }, formatter: (value) => value > 0 ? value : '' },
                tooltip: {
                    callbacks: {
                        label: function (context) { let label = context.dataset.label || ''; if (label) { label += ': '; } if (context.parsed.x !== null) { label += context.parsed.x; } return label; },
                        footer: function (tooltipItems) { let sum = 0; tooltipItems.forEach(item => { sum += item.parsed.x; }); return 'Total: ' + sum; }
                    }
                }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const clickedYear = years[elements[0].index];
                    drawMonthlyAdesoesDetailChart(filteredHistoricalData, clickedYear);
                }
            }
        }
    });

    if (years.length > 0) {
        drawMonthlyAdesoesDetailChart(filteredHistoricalData, years[years.length - 1]);
    }
}
    function drawMonthlyAdesoesDetailChart(data, year) {
    document.getElementById('monthly-adesoes-stacked-title').textContent = `Adesões por Tipo (Mensal ${year})`;
    const adesoesByMonth = Array(12).fill(0).map(() => ({ vendas: 0, posVendas: 0 }));
    const normalizeText = (text) => text?.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    data.forEach(d => {
        if (d.dt_cadastro_integrante.getFullYear() === parseInt(year)) {
            const month = d.dt_cadastro_integrante.getMonth();
            if (normalizeText(d.venda_posvenda) === 'VENDA') {
                adesoesByMonth[month].vendas++;
            } else if (normalizeText(d.venda_posvenda) === 'POS VENDA') {
                adesoesByMonth[month].posVendas++;
            }
        }
    });

    const adesoesVendasMensal = adesoesByMonth.map(m => m.vendas);
    const adesoesPosVendasMensal = adesoesByMonth.map(m => m.posVendas);
    const monthLabels = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

    if (monthlyAdesoesStackedChart) monthlyAdesoesStackedChart.destroy();
    monthlyAdesoesStackedChart = new Chart(document.getElementById('monthlyAdesoesStackedChart'), {
        type: 'bar',
        data: {
            labels: monthLabels,
            datasets: [
                { label: 'Pós Venda', data: adesoesPosVendasMensal, backgroundColor: '#007bff' },
                { label: 'Venda', data: adesoesVendasMensal, backgroundColor: '#6c757d' }
            ]
        },
        options: {
            // AJUSTES ADICIONADOS AQUI
            devicePixelRatio: window.devicePixelRatio,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            // FIM DOS AJUSTES
            
            maintainAspectRatio: false,
            scales: { x: { stacked: true }, y: { stacked: true } },
            plugins: {
                datalabels: { color: 'white', font: { weight: 'bold' }, formatter: (value) => value > 0 ? value : '' },
                tooltip: {
                    callbacks: {
                        label: function (context) { let label = context.dataset.label || ''; if (label) { label += ': '; } if (context.parsed.y !== null) { label += context.parsed.y; } return label; },
                        footer: function (tooltipItems) { let sum = 0; tooltipItems.forEach(item => { sum += item.parsed.y; }); return 'Total: ' + sum; }
                    }
                }
            }
        }
    });
}
    function updateConsultorTable(filteredData) {
        const performanceMap = new Map();
        filteredData.forEach(d => {
            const key = `${d.nm_unidade}-${d.indicado_por}`;
            if (!performanceMap.has(key)) {
                performanceMap.set(key, {
                    unidade: d.nm_unidade,
                    consultor: d.indicado_por,
                    vvr_total: 0,
                    total_adesoes: 0
                });
            }
            const entry = performanceMap.get(key);
            entry.vvr_total += d.vl_plano;
            entry.total_adesoes += 1;
        });

        const tableData = Array.from(performanceMap.values()).map(item => [
            item.unidade,
            item.consultor,
            formatCurrency(item.vvr_total),
            item.total_adesoes
        ]);

        if (consultorDataTable) {
            consultorDataTable.clear().rows.add(tableData).draw();
        } else {
            consultorDataTable = $('#consultor-table').DataTable({
                data: tableData,
                pageLength: 10,
                language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/pt-BR.json' },
                destroy: true,
                dom: 'Bfrtip',
                buttons: [
                    {
                        extend: 'excelHtml5',
                        text: 'Exportar para Excel',
                        title: `Relatorio_Consultores_${new Date().toLocaleDateString('pt-BR')}`,
                        className: 'excel-button',
                        exportOptions: {
                            format: {
                                body: function ( data, row, column, node ) {
                                    if (column === 2) {
                                        return parseFloat(String(data).replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
                                    }
                                    if (column === 3) {
                                        return Number(data);
                                    }
                                    return data;
                                }
                            }
                        }
                    }
                ]
            });
        }
    }

   function updateDetalhadaAdesoesTable(filteredData) {
    const tableData = filteredData.map(d => [
        d.nm_unidade,
        d.codigo_integrante,
        d.nm_integrante,
        d.dt_cadastro_integrante.toLocaleDateString('pt-BR'),
        d.id_fundo,
        d.venda_posvenda,
        d.indicado_por,
        d.vl_plano
    ]);

    if (detalhadaAdesoesDataTable) {
        detalhadaAdesoesDataTable.clear().rows.add(tableData).draw();
    } else {
        detalhadaAdesoesDataTable = $('#detalhada-adesoes-table').DataTable({
            data: tableData,
            columns: [
                null, null, null, null, null, null, null,
                { render: data => formatCurrency(data) }
            ],
            pageLength: 10,
            language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/pt-BR.json' },
            destroy: true,
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar para Excel',
                    title: `Relatorio_Adesoes_Detalhadas_${new Date().toLocaleDateString('pt-BR')}`,
                    className: 'excel-button',
                    exportOptions: {
                        format: {
                            body: function ( data, row, column, node ) {
                                // Coluna 7: VVR (Moeda)
                                if (column === 7) {
                                    // A 'data' aqui é o texto formatado "R$ 1.234,56"
                                    // Precisamos convertê-lo de volta para número
                                    return parseFloat(String(data).replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
                                }
                                // As outras colunas usam o dado bruto
                                return data;
                            }
                        }
                    }
                }
            ]
        });
    }
}
function updateFundosDetalhadosTable(fundosData, selectedUnidades, startDate, endDate) {
    const filteredData = fundosData.filter(d => {
        const isUnitMatch = selectedUnidades.length === 0 || selectedUnidades.includes(d.nm_unidade);
        // Filtra pela data do contrato do fundo
        const isDateMatch = d.dt_contrato >= startDate && d.dt_contrato < endDate;
        return isUnitMatch && isDateMatch;
    });

    const tableData = filteredData.map(d => [
        d.nm_unidade,
        d.id_fundo,
        d.fundo,
        formatDate(d.dt_contrato),
        formatDate(d.dt_cadastro),
        d.tipo_servico,
        d.instituicao,
        formatDate(d.dt_baile)
    ]);

    if (fundosDetalhadosDataTable) {
        fundosDetalhadosDataTable.clear().rows.add(tableData).draw();
    } else {
        fundosDetalhadosDataTable = $('#fundos-detalhados-table').DataTable({
            data: tableData,
            pageLength: 10,
            language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/pt-BR.json' },
            destroy: true,
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar para Excel',
                    title: `Relatorio_Fundos_Detalhados_${new Date().toLocaleDateString('pt-BR')}`,
                    className: 'excel-button'
                }
            ]
        });
    }
}
