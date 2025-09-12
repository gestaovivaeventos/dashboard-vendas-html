// Arquivo: script.js (do Dashboard de Vendas) - VERSÃO COMPLETA E CORRIGIDA

// --- CONFIGURAÇÕES GLOBAIS ---
const SALES_SPREADSHEET_ID = "1HXyq_r2ssJ5c7wXdrBUc-WdqrlCfiZYE1EuIWbIDg0U";

// Configuração do seletor de datas
document.addEventListener('DOMContentLoaded', function() {
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    flatpickr("#date-range", {
        mode: "range",
        dateFormat: "d/m/Y",
        defaultDate: [primeiroDiaMes, hoje],
        locale: "pt",
        theme: "dark",
        showMonths: 2,
        rangeSeparator: " até ",
        disableMobile: true,
        onChange: function(selectedDates) {
            if (selectedDates.length === 2) {
                document.getElementById('start-date').value = selectedDates[0].toISOString().split('T')[0];
                document.getElementById('end-date').value = selectedDates[1].toISOString().split('T')[0];
                // Dispara o evento de mudança para atualizar os dados
                document.getElementById('start-date').dispatchEvent(new Event('change'));
            }
        }
    });
});
const SALES_SHEET_NAME = "ADESOES";
const FUNDOS_SHEET_NAME = "FUNDOS";
const METAS_SPREADSHEET_ID = "1KywSOsTn7qUdVp2dLthWD3Y27RsE1aInk6hRJhp7BFw";
const METAS_SHEET_NAME = "metas";

// --- CONFIGURAÇÕES DA PLANILHA DO FUNIL ---
const FUNIL_SPREADSHEET_ID = "1t67xdPLHB34pZw8WzBUphGRqFye0ZyrTLvDhC7jbVEc";
const FUNIL_SHEET_NAME = "base"; // Nome correto da aba (minúscula)

// --- NOVO: CONFIGURAÇÕES DA PLANILHA DE ACESSO ---
const ACCESS_CONTROL_SPREADSHEET_ID = "1QEsm1u0LDY_-8y_EWgifzUHJCHoz3_VOoUOSXuJZzSM";
const ACCESS_CONTROL_SHEET_NAME = "base";

// --- IMPORTANTE: USE A MESMA CHAVE DE API DA CENTRAL DE DASHS ---
const API_KEY = "AIzaSyBuGRH91CnRuDtN5RGsb5DvHEfhTxJnWSs"; // <-- SUBSTITUA PELA SUA CHAVE DE API

Chart.defaults.color = "#FFFFFF";

// --- REMOVIDO: O mapeamento de códigos de acesso fixo foi retirado daqui ---

let userAccessLevel = null;
let accessDataFromSheet = new Map(); // NOVO: Armazenará os códigos da planilha

let allData = [],
  fundosData = [],
  funilData = [], // NOVO: Dados do funil
  metasData = new Map(),
  cursosUnicos = new Set(),
  fundosUnicos = new Set(),
  dataTable,
  vvrVsMetaPorMesChart,
  cumulativeVvrChart,
  monthlyVvrChart,
  yearlyStackedChart,
  monthlyStackedChart,
  yearlyTicketChart,
  monthlyTicketChart,
  yearlyContractsChart,
  monthlyContractsChart,
  monthlyAdesoesChart,
  yearlyAdesoesStackedChart,
  monthlyAdesoesStackedChart,
  consultorDataTable,
  detalhadaAdesoesDataTable,
  fundosDetalhadosDataTable;
let currentVvrChartType = "total";
let currentTableDataType = "total";
let currentFilteredDataForTable = [];

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date)) return "N/A";
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-br", { style: "currency", currency: "BRL" }).format(
    value || 0,
  );
const formatPercent = (value) =>
  new Intl.NumberFormat("pt-br", {
    style: "percent",
    minimumFractionDigits: 1,
  }).format(value || 0);

// --- NOVO: Função para buscar os dados de acesso da planilha ---
// Arquivo: script.js (do Dashboard de Vendas)

// ...

async function fetchAccessData() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${ACCESS_CONTROL_SPREADSHEET_ID}/values/${ACCESS_CONTROL_SHEET_NAME}?key=${API_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Falha ao carregar os dados de acesso.');
        }
        const data = await response.json();
        const rows = data.values || [];
        
        accessDataFromSheet.clear();
        // Agora captura as colunas: unitName, accessCode, accessLevel, userName, setor, login
        rows.slice(1).forEach(row => {
            const [unitName, accessCode, accessLevel, userName, setor, login] = row;
            
            // Prioriza o login se existir, senão usa o accessCode
            const userLogin = login && login.trim() ? login.trim() : (accessCode ? accessCode.trim() : null);
            
            if (userLogin) {
                if (accessLevel === '1') {
                    accessDataFromSheet.set(userLogin, 'ALL_UNITS');
                } else if (unitName) {
                    const unit = unitName.trim();
                    if (!accessDataFromSheet.has(userLogin)) {
                        accessDataFromSheet.set(userLogin, []); // Inicia como um array
                    }
                    // Adiciona a unidade ao array do código correspondente
                    if(accessDataFromSheet.get(userLogin) !== 'ALL_UNITS') {
                       accessDataFromSheet.get(userLogin).push(unit);
                    }
                }
            }
        });

        // Simplifica os arrays de item único para strings
        // Isso facilita a lógica depois: o tipo da variável (array ou string) define o tipo de usuário
        for (let [code, units] of accessDataFromSheet.entries()) {
            if (Array.isArray(units) && units.length === 1) {
                accessDataFromSheet.set(code, units[0]);
            }
        }
        
        return true;
    } catch (error) {
        console.error("Erro ao buscar dados da planilha de acesso:", error);
        const errorMessage = document.getElementById("error-message");
        if(errorMessage) {
            errorMessage.textContent = 'Erro de comunicação com o servidor de acesso.';
        }
        return false;
    }
}

// ...


// --- BLOCO DE INICIALIZAÇÃO TOTALMENTE ATUALIZADO ---
document.addEventListener("DOMContentLoaded", async () => {
    const loginOverlay = document.getElementById("login-overlay");
    const dashboardWrapper = document.querySelector(".dashboard-wrapper");
    loginOverlay.style.display = "flex";
    dashboardWrapper.style.display = "none";

    const accessReady = await fetchAccessData();
    if (!accessReady) {
        return; 
    }

    const proceedWithLogin = (code) => {
        const unit = accessDataFromSheet.get(code);
        
        if (unit) {
            userAccessLevel = unit;
            
            const returnLink = document.getElementById('return-to-hub-link');
            if (returnLink) {
                const encodedCode = btoa(code);
                returnLink.href = `${returnLink.href}?pk=${encodedCode}`;
            }

            loginOverlay.style.display = "none";
            dashboardWrapper.style.display = "flex";
            initializeDashboard();
            return true;
        }
        return false;
    };

    const urlParams = new URLSearchParams(window.location.search);
    const encodedCodeFromUrl = urlParams.get('pk');
    let loggedInFromUrl = false;

    if (encodedCodeFromUrl) {
        try {
            const decodedCode = atob(encodedCodeFromUrl);
            if (proceedWithLogin(decodedCode)) {
                loggedInFromUrl = true;
            }
        } catch (e) {
            console.error("Falha ao decodificar o código da URL:", e);
        }
    }

    if (!loggedInFromUrl) {
        const accessCodeInput = document.getElementById("access-code");
        const accessCodeButton = document.getElementById("submit-code");
        const errorMessage = document.getElementById("error-message");

        accessCodeInput.focus();

        const attemptLogin = () => {
            const code = accessCodeInput.value.trim();
            if (!proceedWithLogin(code)) {
                errorMessage.textContent = "Login inválido!";
                errorMessage.style.display = "block";
                accessCodeInput.value = "";
                accessCodeInput.focus();
            } else {
                errorMessage.style.display = "none";
            }
        };

        accessCodeButton.addEventListener("click", attemptLogin);
        accessCodeInput.addEventListener("keyup", (event) => {
            if (event.key === "Enter") {
                attemptLogin();
            }
        });
    }
});
// --- FIM DO BLOCO DE INICIALIZAÇÃO ATUALIZADO ---


async function initializeDashboard() {
  displayLastUpdateMessage();
  const loader = document.getElementById("loader");
  try {
    const [salesData, sheetData, novosFundosData, dadosFunil] = await Promise.all([
      fetchAllSalesDataFromSheet(),
      fetchMetasData(),
      fetchFundosData(),
      fetchFunilData(),
    ]);

    allData = salesData;
    metasData = sheetData;
    fundosData = novosFundosData;
    funilData = dadosFunil;
    
    console.log("=== DEBUG FUNIL ===");
    console.log("Dados do funil carregados:", dadosFunil ? dadosFunil.length : 0);
    if (dadosFunil && dadosFunil.length > 0) {
      console.log("Primeira linha do funil:", dadosFunil[0]);
      console.log("Amostra de 3 registros:", dadosFunil.slice(0, 3));
    }

    if (allData && allData.length > 0) {
      loader.style.display = "none";
      [
        "filters-section", "kpi-section", "kpi-section-py", "chart-vvr-mes-section",
        "chart-cumulative-section", "table-section", "chart-monthly-vvr-section",
        "chart-yearly-stacked-section", "chart-monthly-stacked-section",
        "chart-yearly-ticket-section", "chart-monthly-ticket-section",
        "chart-yearly-contracts-section", "chart-monthly-contracts-section",
        "chart-monthly-adesoes-section", "chart-yearly-adesoes-stacked-section",
        "chart-monthly-adesoes-stacked-section", "consultor-table-section",
        "detalhada-adesoes-table-section", "fundos-detalhados-table-section",
        "funil-indicators-section", "funil-captacoes-section",
      ].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = "block";
      });
      document.getElementById("filters-section").style.display = "flex";

      populateFilters();
      addEventListeners();
      updateDashboard();
    } else {
      loader.innerHTML = "Nenhum dado de vendas encontrado ou falha ao carregar.";
    }
  } catch (error) {
    console.error("Erro fatal na inicialização:", error);
    loader.innerHTML = `Erro ao carregar dados. Verifique o console (F12).`;
  }
}

document.getElementById("sidebar-toggle").addEventListener("click", function () {
  document.getElementById("sidebar").classList.toggle("collapsed");
  document.getElementById("main-content").classList.toggle("full-width");
  this.classList.toggle("collapsed");

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

// FUNÇÃO ATUALIZADA: Correção no processamento de datas
async function fetchAllSalesDataFromSheet() {
    if (!SALES_SPREADSHEET_ID || !SALES_SHEET_NAME || !API_KEY) {
        console.error("ID da Planilha de Vendas, Nome da Aba ou Chave de API não configurados.");
        return [];
    }
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SALES_SPREADSHEET_ID}/values/${SALES_SHEET_NAME}?key=${API_KEY}`;
    
    const parseDate = (dateString) => {
        if (!dateString || typeof dateString !== 'string') return null;
        const parts = dateString.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (parts) {
            return new Date(parts[3], parts[2] - 1, parts[1]);
        }
        const date = new Date(dateString);
        return isNaN(date) ? null : date;
    };

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error("Erro ao buscar dados de vendas da planilha:", await response.json());
            return [];
        }
        const data = await response.json();
        const rows = data.values || [];
        if (rows.length < 2) return [];

        const headers = rows[0].map((h) => h.trim().toLowerCase());
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
        const cursoFundoIndex = headers.indexOf("curso_fundo");

        return rows.slice(1).map((row) => {
            const dateValue = parseDate(row[dataIndex]);
            if (!dateValue) return null;
            return {
                nm_unidade: row[unidadeIndex] || "N/A",
                dt_cadastro_integrante: dateValue,
                vl_plano: parseFloat(String(row[valorIndex] || "0").replace(",", ".")) || 0,
                venda_posvenda: tipoVendaIndex !== -1 ? row[tipoVendaIndex] || "VENDA" : "N/A",
                indicado_por: indicadoPorIndex !== -1 ? row[indicadoPorIndex] || "N/A" : "N/A",
                codigo_integrante: codigoIntegranteIndex !== -1 ? row[codigoIntegranteIndex] || "N/A" : "N/A",
                nm_integrante: nomeIntegranteIndex !== -1 ? row[nomeIntegranteIndex] || "N/A" : "N/A",
                id_fundo: idFundoIndex !== -1 ? row[idFundoIndex] || "N/A" : "N/A",
                curso_fundo: cursoFundoIndex !== -1 ? row[cursoFundoIndex] || "" : "",
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

    const headers = rows[0].map((h) => String(h).trim().toLowerCase());
    const unidadeIndex = headers.indexOf("nm_unidade");
    const idFundoIndex = headers.indexOf("id_fundo");
    const fundoIndex = headers.indexOf("nm_fundo");
    const dtContratoIndex = headers.indexOf("dt_contrato");
    const dtCadastroIndex = headers.indexOf("dt_cadastro_fundo");
    const tipoServicoIndex = headers.indexOf("tp_servico");
    const instituicaoIndex = headers.indexOf("nm_instituicao");
    const cursoFundoIndex = headers.indexOf("curso_fundo");
    const dtBaileIndex = headers.indexOf("dt_baile");

    if (unidadeIndex === -1 || idFundoIndex === -1 || dtContratoIndex === -1) {
      console.error("Colunas essenciais (nm_unidade, id_fundo, dt_contrato) não foram encontradas na planilha FUNDOS.");
      return [];
    }

    const parsePtBrDate = (dateString) => {
      if (!dateString || typeof dateString !== "string") return null;
      const parts = dateString.split("/");
      if (parts.length === 3) {
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`); // Usando formato ISO para evitar ambiguidades
      }
      const date = new Date(dateString);
      return isNaN(date) ? null : date;
    };

    return rows.slice(1).map((row) => {
      const dtContrato = parsePtBrDate(row[dtContratoIndex]);
      if (!dtContrato) return null;

      return {
        nm_unidade: row[unidadeIndex] || "N/A",
        id_fundo: row[idFundoIndex] || "N/A",
        nm_fundo: fundoIndex !== -1 ? row[fundoIndex] || "N/A" : "N/A",
        dt_contrato: dtContrato,
        dt_cadastro: dtCadastroIndex !== -1 ? parsePtBrDate(row[dtCadastroIndex]) : null,
        tipo_servico: tipoServicoIndex !== -1 ? row[tipoServicoIndex] || "N/A" : "N/A",
        instituicao: instituicaoIndex !== -1 ? row[instituicaoIndex] || "N/A" : "N/A",
        dt_baile: dtBaileIndex !== -1 ? parsePtBrDate(row[dtBaileIndex]) : null,
        curso_fundo: cursoFundoIndex !== -1 ? row[cursoFundoIndex] || "" : "",
      };
    }).filter(Boolean);
  } catch (error) {
    console.error("Erro CRÍTICO ao buscar dados de fundos:", error);
    return [];
  }
}

async function fetchMetasData() {
  if (!METAS_SPREADSHEET_ID || !METAS_SHEET_NAME || !API_KEY) {
    console.error("Configurações da planilha de metas incompletas.");
    return new Map();
  }
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${METAS_SPREADSHEET_ID}/values/${METAS_SHEET_NAME}?key=${API_KEY}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error("Erro API Google Sheets:", await response.json());
      return new Map();
    }
    const data = await response.json();
    const rows = data.values || [];
    const metasMap = new Map();
    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const unidadeIndex = headers.indexOf("nm_unidade"),
      anoIndex = headers.indexOf("ano"),
      mesIndex = headers.indexOf("mês"),
      metaVendasIndex = headers.indexOf("meta vvr_venda"),
      metaPosvendasIndex = headers.indexOf("meta vvr_pos_venda"),
      metaAdesoesIndex = headers.indexOf("meta adesões");

    rows.slice(1).forEach((row) => {
      const unidade = row[unidadeIndex],
        ano = row[anoIndex],
        mes = String(row[mesIndex]).padStart(2, "0");
      const parseMetaValue = (index) => parseFloat(String(row[index] || "0").replace(/\./g, "").replace(",", ".")) || 0;
      const metaVendas = parseMetaValue(metaVendasIndex),
        metaPosvendas = parseMetaValue(metaPosvendasIndex),
        metaAdesoes = parseInt(row[metaAdesoesIndex]) || 0;
      if (unidade && ano && mes) {
        const chave = `${unidade}-${ano}-${mes}`;
        metasMap.set(chave, {
          meta_vvr_vendas: metaVendas,
          meta_vvr_posvendas: metaPosvendas,
          meta_vvr_total: metaVendas + metaPosvendas,
          meta_adesoes: metaAdesoes,
        });
      }
    });
    return metasMap;
  } catch (error) {
    console.error("Erro CRÍTICO ao buscar metas:", error);
    return new Map();
  }
}

// --- NOVO: FUNÇÃO PARA CARREGAR DADOS DO FUNIL ---
async function fetchFunilData() {
  console.log("=== INÍCIO fetchFunilData ===");
  console.log("FUNIL_SPREADSHEET_ID:", FUNIL_SPREADSHEET_ID);
  console.log("FUNIL_SHEET_NAME:", FUNIL_SHEET_NAME);
  console.log("API_KEY existe:", !!API_KEY);
  
  if (!FUNIL_SPREADSHEET_ID || !FUNIL_SHEET_NAME || !API_KEY) {
    console.error("❌ Configurações da planilha do funil incompletas.");
    return [];
  }
  
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${FUNIL_SPREADSHEET_ID}/values/${FUNIL_SHEET_NAME}?key=${API_KEY}`;
  console.log("URL da API:", url);
  
  try {
    console.log("Fazendo requisição para a API...");
    const response = await fetch(url);
    console.log("Status da resposta:", response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Erro API Google Sheets para funil:", errorData);
      return [];
    }
    
    const data = await response.json();
    console.log("Dados recebidos da API:", data);
    
    const rows = data.values || [];
    console.log("Número de linhas recebidas:", rows.length);
    
    if (rows.length === 0) {
      console.log("❌ Nenhuma linha encontrada na planilha");
      return [];
    }
    
    const headers = rows[0];
    console.log("Headers da planilha:", headers);
    console.log("Primeira linha completa:", rows[0]);
    
    // Encontrar índices das colunas importantes
    const tituloIndex = 0; // Coluna A - Título
    const criadoEmIndex = 12; // Coluna M - Data criação
    
    // Vamos procurar a coluna nm_unidade dinamicamente no header
    let unidadeIndex = -1;
    headers.forEach((header, index) => {
      if (header && (header.toLowerCase().includes('nm_unidade') || header.toLowerCase().includes('unidade'))) {
        unidadeIndex = index;
        console.log(`✅ Coluna unidade encontrada: "${header}" no índice ${index}`);
      }
    });
    
    if (unidadeIndex === -1) {
      console.warn("⚠️ Coluna nm_unidade não encontrada, tentando índice 72 como fallback");
      unidadeIndex = 72;
    }
    
    console.log("Índices - Título:", tituloIndex, "Criado em:", criadoEmIndex, "Unidade:", unidadeIndex);
    
    if (rows.length > 1) {
      console.log("Segunda linha como exemplo:", rows[1]);
      console.log("Título (A):", rows[1][tituloIndex]);
      console.log("Criado em (M):", rows[1][criadoEmIndex]);
      console.log("Unidade (BU):", rows[1][unidadeIndex]);
    }
    
    const processedData = rows.slice(1).map((row, index) => ({
      id: index + 1,
      titulo: row[tituloIndex] || '',
      criado_em: row[criadoEmIndex] || '',
      nm_unidade: row[unidadeIndex] || '',
      row_data: row
    })).filter(item => item.titulo && item.titulo.trim() !== '');
    
    console.log("Dados processados:", processedData.length, "registros válidos");
    if (processedData.length > 0) {
      console.log("Primeiro registro processado:", processedData[0]);
      
      // Debug: mostrar todas as unidades encontradas
      const unidadesEncontradas = [...new Set(processedData.map(item => item.nm_unidade).filter(Boolean))];
      console.log("🏢 Unidades encontradas na planilha:", unidadesEncontradas);
      
      // Debug: contar por unidade
      const contadorPorUnidade = {};
      processedData.forEach(item => {
        const unidade = item.nm_unidade || 'SEM_UNIDADE';
        contadorPorUnidade[unidade] = (contadorPorUnidade[unidade] || 0) + 1;
      });
      console.log("📊 Contagem por unidade:", contadorPorUnidade);
      
      console.log("Amostra de títulos:", processedData.slice(0, 3).map(item => ({
        titulo: item.titulo,
        unidade: item.nm_unidade,
        criado_em: item.criado_em
      })));
    }
    
    console.log("=== FIM fetchFunilData ===");
    return processedData;
  
  console.log("FUNIL_SPREADSHEET_ID:", FUNIL_SPREADSHEET_ID);
  console.log("FUNIL_SHEET_NAME:", FUNIL_SHEET_NAME);
  console.log("API_KEY existe:", !!API_KEY);
  
  if (!FUNIL_SPREADSHEET_ID || !FUNIL_SHEET_NAME || !API_KEY) {
    console.error("❌ Configurações da planilha do funil incompletas.");
    return [];
  }
    
    console.log("=== FIM fetchFunilData ===");
    return processedData;
  } catch (error) {
    console.error("❌ Erro CRÍTICO ao buscar dados do funil:", error);
    return [];
  }
}

function processAndCrossReferenceData(salesData) {
  const vendasPorMesUnidade = salesData.reduce((acc, d) => {
    const year = d.dt_cadastro_integrante.getFullYear();
    const month = String(d.dt_cadastro_integrante.getMonth() + 1).padStart(2, "0");
    const periodo = `${year}-${month}`;
    const chave = `${d.nm_unidade}-${periodo}`;
    if (!acc[chave]) {
      acc[chave] = {
        unidade: d.nm_unidade,
        periodo: periodo,
        realizado_vvr: 0,
        realizado_adesoes: 0,
      };
    }
    acc[chave].realizado_vvr += d.vl_plano;
    acc[chave].realizado_adesoes += 1;
    return acc;
  }, {});
  return Object.values(vendasPorMesUnidade).map((item) => {
    const chaveMeta = `${item.unidade}-${item.periodo}`;
    const meta = metasData.get(chaveMeta) || {
      meta_vvr_total: 0,
      meta_vvr_vendas: 0,
      meta_vvr_posvendas: 0,
      meta_adesoes: 0,
    };
    return { ...item, ...meta };
  });
}

function updateMainKPIs(dataBruta, selectedUnidades, startDate, endDate) {
    const getColorForPercentage = (percent) => {
        if (percent >= 1) return "#28a745";
        if (percent >= 0.5) return "#ffc107";
        return "#dc3545";
    };
    const normalizeText = (text) => text?.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const realizadoVendas = dataBruta.filter((d) => normalizeText(d.venda_posvenda) === "VENDA").reduce((sum, d) => sum + d.vl_plano, 0);
    const realizadoPosVendas = dataBruta.filter((d) => normalizeText(d.venda_posvenda) === "POS VENDA").reduce((sum, d) => sum + d.vl_plano, 0);
    const realizadoTotal = realizadoVendas + realizadoPosVendas;

    let metaVendas = 0;
    let metaPosVendas = 0;
    
    // --- TRAVA DE SEGURANÇA DEFINITIVA DENTRO DA FUNÇÃO ---
    // Só calcula a meta se o usuário for admin OU se for um franqueado com unidades selecionadas.
    const canCalculateMeta = (userAccessLevel === 'ALL_UNITS' || selectedUnidades.length > 0);

    if (canCalculateMeta) {
        // Se for admin e não selecionou nada, considera todas as unidades. Senão, usa as selecionadas.
        const unitsToConsider = (userAccessLevel === 'ALL_UNITS' && selectedUnidades.length === 0)
            ? [...new Set(allData.map(d => d.nm_unidade))]
            : selectedUnidades;

        metasData.forEach((metaInfo, key) => {
            const [unidade, ano, mes] = key.split("-");
            const metaDate = new Date(ano, parseInt(mes) - 1, 1);
            if (unitsToConsider.includes(unidade) && metaDate >= startDate && metaDate < endDate) {
                metaVendas += metaInfo.meta_vvr_vendas;
                metaPosVendas += metaInfo.meta_vvr_posvendas;
            }
        });
    }
    // Se 'canCalculateMeta' for falso, as metas permanecerão 0.

    const metaTotal = metaVendas + metaPosVendas;
    const percentTotal = metaTotal > 0 ? realizadoTotal / metaTotal : 0;
    const percentVendas = metaVendas > 0 ? realizadoVendas / metaVendas : 0;
    const percentPosVendas = metaPosVendas > 0 ? realizadoPosVendas / metaPosVendas : 0;

    const totalColor = getColorForPercentage(percentTotal);
    document.getElementById("kpi-total-realizado").textContent = formatCurrency(realizadoTotal);
    document.getElementById("kpi-total-meta").textContent = formatCurrency(metaTotal);
    const totalPercentEl = document.getElementById("kpi-total-percent");
    totalPercentEl.textContent = formatPercent(percentTotal);
    totalPercentEl.style.color = totalColor;
    document.getElementById("kpi-total-progress").style.backgroundColor = totalColor;
    document.getElementById("kpi-total-progress").style.width = `${Math.min(percentTotal * 100, 100)}%`;

    const vendasColor = getColorForPercentage(percentVendas);
    document.getElementById("kpi-vendas-realizado").textContent = formatCurrency(realizadoVendas);
    document.getElementById("kpi-vendas-meta").textContent = formatCurrency(metaVendas);
    const vendasPercentEl = document.getElementById("kpi-vendas-percent");
    vendasPercentEl.textContent = formatPercent(percentVendas);
    vendasPercentEl.style.color = vendasColor;
    document.getElementById("kpi-vendas-progress").style.backgroundColor = vendasColor;
    document.getElementById("kpi-vendas-progress").style.width = `${Math.min(percentVendas * 100, 100)}%`;

    const posVendasColor = getColorForPercentage(percentPosVendas);
    document.getElementById("kpi-posvendas-realizado").textContent = formatCurrency(realizadoPosVendas);
    document.getElementById("kpi-posvendas-meta").textContent = formatCurrency(metaPosVendas);
    const posVendasPercentEl = document.getElementById("kpi-posvendas-percent");
    posVendasPercentEl.textContent = formatPercent(percentPosVendas);
    posVendasPercentEl.style.color = posVendasColor;
    document.getElementById("kpi-posvendas-progress").style.backgroundColor = posVendasColor;
    document.getElementById("kpi-posvendas-progress").style.width = `${Math.min(percentPosVendas * 100, 100)}%`;
}

function updatePreviousYearKPIs(dataBruta, selectedUnidades, startDate, endDate) {
    const getColorForPercentage = (percent) => {
        if (percent >= 1) return "#28a745";
        if (percent >= 0.5) return "#ffc107";
        return "#dc3545";
    };
    const normalizeText = (text) => text?.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    const realizadoVendas = dataBruta.filter((d) => normalizeText(d.venda_posvenda) === "VENDA").reduce((sum, d) => sum + d.vl_plano, 0);
    const realizadoPosVendas = dataBruta.filter((d) => normalizeText(d.venda_posvenda) === "POS VENDA").reduce((sum, d) => sum + d.vl_plano, 0);
    const realizadoTotal = realizadoVendas + realizadoPosVendas;
    
    let metaVendas = 0;
    let metaPosVendas = 0;

    // --- TRAVA DE SEGURANÇA DEFINITIVA DENTRO DA FUNÇÃO ---
    const canCalculateMeta = (userAccessLevel === 'ALL_UNITS' || selectedUnidades.length > 0);

    if (canCalculateMeta) {
        const unitsToConsider = (userAccessLevel === 'ALL_UNITS' && selectedUnidades.length === 0)
            ? [...new Set(allData.map(d => d.nm_unidade))]
            : selectedUnidades;
            
        metasData.forEach((metaInfo, key) => {
            const [unidade, ano, mes] = key.split("-");
            const metaDate = new Date(ano, parseInt(mes) - 1, 1);
            if (unitsToConsider.includes(unidade) && metaDate >= startDate && metaDate < endDate) {
                metaVendas += metaInfo.meta_vvr_vendas;
                metaPosVendas += metaInfo.meta_vvr_posvendas;
            }
        });
    }
    
    const metaTotal = metaVendas + metaPosVendas;
    const percentTotal = metaTotal > 0 ? realizadoTotal / metaTotal : 0;
    const percentVendas = metaVendas > 0 ? realizadoVendas / metaVendas : 0;
    const percentPosVendas = metaPosVendas > 0 ? realizadoPosVendas / metaPosVendas : 0;

    const totalColor = getColorForPercentage(percentTotal);
    document.getElementById("kpi-total-realizado-py").textContent = formatCurrency(realizadoTotal);
    document.getElementById("kpi-total-meta-py").textContent = formatCurrency(metaTotal);
    const totalPercentEl = document.getElementById("kpi-total-percent-py");
    totalPercentEl.textContent = formatPercent(percentTotal);
    totalPercentEl.style.color = totalColor;
    document.getElementById("kpi-total-progress-py").style.backgroundColor = totalColor;
    document.getElementById("kpi-total-progress-py").style.width = `${Math.min(percentTotal * 100, 100)}%`;

    const vendasColor = getColorForPercentage(percentVendas);
    document.getElementById("kpi-vendas-realizado-py").textContent = formatCurrency(realizadoVendas);
    document.getElementById("kpi-vendas-meta-py").textContent = formatCurrency(metaVendas);
    const vendasPercentEl = document.getElementById("kpi-vendas-percent-py");
    vendasPercentEl.textContent = formatPercent(percentVendas);
    vendasPercentEl.style.color = vendasColor;
    document.getElementById("kpi-vendas-progress-py").style.backgroundColor = vendasColor;
    document.getElementById("kpi-vendas-progress-py").style.width = `${Math.min(percentVendas * 100, 100)}%`;

    const posVendasColor = getColorForPercentage(percentPosVendas);
    document.getElementById("kpi-posvendas-realizado-py").textContent = formatCurrency(realizadoPosVendas);
    document.getElementById("kpi-posvendas-meta-py").textContent = formatCurrency(metaPosVendas);
    const posVendasPercentEl = document.getElementById("kpi-posvendas-percent-py");
    posVendasPercentEl.textContent = formatPercent(percentPosVendas);
    posVendasPercentEl.style.color = posVendasColor;
    document.getElementById("kpi-posvendas-progress-py").style.backgroundColor = posVendasColor;
    document.getElementById("kpi-posvendas-progress-py").style.width = `${Math.min(percentPosVendas * 100, 100)}%`;
}

// FUNÇÃO ATUALIZADA: Correção na lógica dos filtros de data
// Arquivo: script.js (do Dashboard de Vendas)

// ...

function updateDashboard() {
    console.log('updateDashboard called');
    const selectedUnidades = $("#unidade-filter").val() || [];
    console.log('Selected unidades in updateDashboard:', selectedUnidades);
    const selectedCursos = $("#curso-filter").val() || [];
    const selectedFundos = $("#fundo-filter").val() || [];
    
    const startDateString = document.getElementById("start-date").value;
    const [startYear, startMonth, startDay] = startDateString.split('-').map(Number);
    const startDate = new Date(startYear, startMonth - 1, startDay);
    
    const endDateString = document.getElementById("end-date").value;
    const [endYear, endMonth, endDay] = endDateString.split('-').map(Number);
    const endDate = new Date(endYear, endMonth - 1, endDay);
    endDate.setDate(endDate.getDate() + 1);

    const anoVigenteParaGrafico = startDate.getFullYear();

    let dataBrutaFiltrada = [], dataParaGraficoAnual = [], allDataForOtherCharts = [], fundosDataFiltrado = [], dataBrutaFiltradaPY = [];
    const hasPermissionToViewData = (userAccessLevel === 'ALL_UNITS' || selectedUnidades.length > 0);

    if (hasPermissionToViewData) {
        const filterLogic = d => {
            const unidadeMatch = selectedUnidades.length === 0 || selectedUnidades.includes(d.nm_unidade);
            const cursoMatch = selectedCursos.length === 0 || (d.curso_fundo && selectedCursos.includes(d.curso_fundo));
            const fundoMatch = selectedFundos.length === 0 || (d.nm_fundo && selectedFundos.includes(d.nm_fundo));
            return unidadeMatch && cursoMatch && fundoMatch;
        };
        
        // Filtrar dados de adesões
        dataBrutaFiltrada = allData.filter(d => filterLogic(d) && d.dt_cadastro_integrante >= startDate && d.dt_cadastro_integrante < endDate);
        dataParaGraficoAnual = allData.filter(d => filterLogic(d) && d.dt_cadastro_integrante.getFullYear() === anoVigenteParaGrafico);
        allDataForOtherCharts = allData.filter(filterLogic);

        // Filtrar dados de fundos usando dt_contrato
        fundosDataFiltrado = fundosData.filter(d => {
            const unidadeMatch = selectedUnidades.length === 0 || selectedUnidades.includes(d.nm_unidade);
            const cursoMatch = selectedCursos.length === 0 || (d.curso_fundo && selectedCursos.includes(d.curso_fundo));
            const fundoMatch = selectedFundos.length === 0 || (d.nm_fundo && selectedFundos.includes(d.nm_fundo));
            const dateMatch = d.dt_contrato && d.dt_contrato >= startDate && d.dt_contrato < endDate;
            return unidadeMatch && cursoMatch && fundoMatch && dateMatch;
        });

        const sDPY = new Date(startDate); sDPY.setFullYear(sDPY.getFullYear() - 1);
        const eDPY = new Date(endDate); eDPY.setFullYear(eDPY.getFullYear() - 1);
        dataBrutaFiltradaPY = allData.filter(d => filterLogic(d) && d.dt_cadastro_integrante >= sDPY && d.dt_cadastro_integrante < eDPY);
    }
    
    // ATUALIZAÇÃO DOS COMPONENTES
    updateVvrVsMetaPorMesChart(dataParaGraficoAnual, anoVigenteParaGrafico);
    updateCumulativeVvrChart(allDataForOtherCharts, selectedUnidades);
    updateMonthlyVvrChart(allDataForOtherCharts, selectedUnidades);
    
    // A chamada para a função corrigida agora passa só um parâmetro
    updateMonthlyAdesoesChart(allDataForOtherCharts);
    
    // Todas as chamadas abaixo estão corrigidas e seguras
    updateDrillDownCharts(allDataForOtherCharts);
    updateTicketCharts(allDataForOtherCharts);
    updateContractsCharts(fundosDataFiltrado);
    updateAdesoesDrillDownCharts(allDataForOtherCharts);
    
    updateConsultorTable(dataBrutaFiltrada);
    updateDetalhadaAdesoesTable(dataBrutaFiltrada);
    updateFundosDetalhadosTable(fundosDataFiltrado, selectedUnidades, startDate, endDate);
    updateFunilIndicators(startDate, endDate, selectedUnidades);
    updateMainKPIs(dataBrutaFiltrada, selectedUnidades, startDate, endDate);
    
    const dataAgregadaComVendas = processAndCrossReferenceData(dataBrutaFiltrada);
    currentFilteredDataForTable = dataAgregadaComVendas; 
    updateDataTable(dataAgregadaComVendas);
    
    document.getElementById("kpi-section-py").style.display = "block";
    updatePreviousYearKPIs(dataBrutaFiltradaPY, selectedUnidades, startDate, endDate);
}

// ...


function updateVvrVsMetaPorMesChart(salesDataForYear, anoVigente) {
    const allYearPeriodos = Array.from({ length: 12 }, (_, i) => `${anoVigente}-${String(i + 1).padStart(2, "0")}`);
    const chartDataMap = new Map();
    
    // Inicializa o mapa do gráfico com valores zerados
    allYearPeriodos.forEach((periodo) => {
        chartDataMap.set(periodo, {
            realizado_vendas: 0,
            realizado_posvendas: 0,
            meta_vendas: 0,
            meta_posvendas: 0,
            meta_total: 0,
        });
    });

    const normalizeText = (text) => text?.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // 1. Calcula o VALOR REALIZADO (esta parte já estava correta)
    // Ela usa 'salesDataForYear', que já vem filtrado ou vazio
    salesDataForYear.forEach((d) => {
        const year = d.dt_cadastro_integrante.getFullYear();
        const month = String(d.dt_cadastro_integrante.getMonth() + 1).padStart(2, "0");
        const periodo = `${year}-${month}`;
        if (chartDataMap.has(periodo)) {
            if (normalizeText(d.venda_posvenda) === "VENDA") {
                chartDataMap.get(periodo).realizado_vendas += d.vl_plano;
            } else if (normalizeText(d.venda_posvenda) === "POS VENDA") {
                chartDataMap.get(periodo).realizado_posvendas += d.vl_plano;
            }
        }
    });

    // 2. Calcula a META (lógica de segurança aplicada aqui)
    const selectedUnidades = $("#unidade-filter").val() || [];
    const canCalculateMeta = (userAccessLevel === 'ALL_UNITS' || selectedUnidades.length > 0);

    if (canCalculateMeta) {
        const unitsToConsider = (userAccessLevel === 'ALL_UNITS' && selectedUnidades.length === 0)
            ? [...new Set(allData.map(d => d.nm_unidade))]
            : selectedUnidades;

        metasData.forEach((metaInfo, key) => {
            const [unidade, ano, mes] = key.split("-");
            const periodo = `${ano}-${mes}`;
            if (String(ano) === String(anoVigente) && chartDataMap.has(periodo)) {
                if (unitsToConsider.includes(unidade)) {
                    chartDataMap.get(periodo).meta_vendas += metaInfo.meta_vvr_vendas;
                    chartDataMap.get(periodo).meta_posvendas += metaInfo.meta_vvr_posvendas;
                    chartDataMap.get(periodo).meta_total += metaInfo.meta_vvr_total;
                }
            }
        });
    }
    // Se 'canCalculateMeta' for falso, os valores de meta no chartDataMap permanecerão 0.

    // 3. Monta e desenha o gráfico (nenhuma alteração aqui)
    let realizadoValues, metaValues;
    if (currentVvrChartType === "vendas") {
        realizadoValues = allYearPeriodos.map((p) => chartDataMap.get(p).realizado_vendas);
        metaValues = allYearPeriodos.map((p) => chartDataMap.get(p).meta_vendas);
    } else if (currentVvrChartType === "posvendas") {
        realizadoValues = allYearPeriodos.map((p) => chartDataMap.get(p).realizado_posvendas);
        metaValues = allYearPeriodos.map((p) => chartDataMap.get(p).meta_posvendas);
    } else { // 'total'
        realizadoValues = allYearPeriodos.map((p) => chartDataMap.get(p).realizado_vendas + chartDataMap.get(p).realizado_posvendas);
        metaValues = allYearPeriodos.map((p) => chartDataMap.get(p).meta_total);
    }

    const formattedLabels = allYearPeriodos.map((periodo) => {
        const [year, month] = periodo.split("-");
        const date = new Date(year, month - 1);
        const monthName = date.toLocaleString("pt-BR", { month: "short" }).replace(".", "");
        return `${monthName}-${year.slice(2)}`;
    });

    if (vvrVsMetaPorMesChart) vvrVsMetaPorMesChart.destroy();
    Chart.register(ChartDataLabels);
    vvrVsMetaPorMesChart = new Chart(document.getElementById("vvrVsMetaPorMesChart"), {
        type: "bar",
        data: {
            labels: formattedLabels,
            datasets: [
                { label: "VVR Realizado", data: realizadoValues, backgroundColor: "rgba(255, 193, 7, 0.7)", order: 1 },
                {
                    label: "Meta VVR",
                    data: metaValues,
                    type: "line",
                    borderColor: "rgb(220, 53, 69)",
                    order: 0,
                    datalabels: {
                        display: true,
                        align: "bottom",
                        backgroundColor: "rgba(0, 0, 0, 0.6)",
                        borderRadius: 4,
                        color: "white",
                        font: { size: 15 },
                        padding: 4,
                        formatter: (value) => (value > 0 ? `${(value / 1000).toFixed(0)}k` : ""),
                    },
                },
            ],
        },
        options: {
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                datalabels: {
                    anchor: "end",
                    align: "end",
                    formatter: (value) => (value >= 1000 ? `${(value / 1000).toFixed(0)}k` : ""),
                    color: "#F8F9FA",
                    font: { weight: "bold" },
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || "";
                            if (label) { label += ": "; }
                            if (context.parsed.y !== null) { label += formatCurrency(context.parsed.y); }
                            return label;
                        },
                    },
                },
            },
            scales: { y: { beginAtZero: true } },
        },
    });
}

// O restante do seu código (updateCumulativeVvrChart, updateMonthlyVvrChart, etc.)
// permanece o mesmo do original, pois eles já tinham as configurações corretas de tooltips.
// Por favor, garanta que o restante do seu arquivo (não mostrado aqui por brevidade)
// seja mantido como estava na versão original que você me enviou.

// ... cole o restante das suas funções originais aqui (a partir de updateCumulativeVvrChart) ...

function updateCumulativeVvrChart(historicalData, selectedUnidades) {
    const selectorContainer = document.getElementById("cumulative-chart-selector");
    const unitsToConsider = selectedUnidades.length > 0 ? selectedUnidades : [...new Set(allData.map((d) => d.nm_unidade))];
    const filteredHistoricalData = historicalData.filter((d) => unitsToConsider.includes(d.nm_unidade));
    
    const salesByYearMonth = {};
    const uniqueYears = [...new Set(filteredHistoricalData.map((d) => d.dt_cadastro_integrante.getFullYear()))].sort();
    
    if (selectorContainer.children.length === 0) {
        uniqueYears.forEach((year) => {
            const button = document.createElement("button");
            button.dataset.year = year;
            button.textContent = year;
            if (year >= uniqueYears[uniqueYears.length - 2]) { button.classList.add("active"); }
            selectorContainer.appendChild(button);
        });
        selectorContainer.querySelectorAll("button").forEach((button) => {
            button.addEventListener("click", () => {
                button.classList.toggle("active");
                updateDashboard();
            });
        });
    }

    const activeYears = Array.from(selectorContainer.querySelectorAll("button.active")).map((btn) => parseInt(btn.dataset.year));
    filteredHistoricalData.forEach((d) => {
        const year = d.dt_cadastro_integrante.getFullYear();
        const month = d.dt_cadastro_integrante.getMonth();
        if (!salesByYearMonth[year]) { salesByYearMonth[year] = Array(12).fill(0); }
        salesByYearMonth[year][month] += d.vl_plano;
    });
    
    const colors = ["#ffc107", "#007bff", "#6c757d", "#28a745", "#dc3545", "#17a2b8", "#fd7e14"];
    const datasets = uniqueYears.map((year, index) => {
        const monthlyData = salesByYearMonth[year] || Array(12).fill(0);
        const cumulativeData = monthlyData.reduce((acc, val) => [...acc, (acc.length > 0 ? acc[acc.length - 1] : 0) + val], []);
        return {
            label: year,
            data: cumulativeData,
            borderColor: colors[index % colors.length],
            fill: false,
            tension: 0.1,
            hidden: !activeYears.includes(year),
        };
    });

    const monthLabels = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    if (cumulativeVvrChart) cumulativeVvrChart.destroy();
    cumulativeVvrChart = new Chart(document.getElementById("cumulativeVvrChart"), {
        type: "line",
        data: { labels: monthLabels, datasets: datasets },
        options: {
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || "";
                            if (label) { label += ": "; }
                            if (context.parsed.y !== null) { label += formatCurrency(context.parsed.y); }
                            return label;
                        },
                    },
                },
                datalabels: {
                    display: true, align: "top", offset: 8, backgroundColor: "rgba(52, 58, 64, 0.7)", borderRadius: 4, color: "white", font: { size: 14 }, padding: 4,
                    formatter: (value) => {
                        if (value > 0) {
                            if (value >= 1000000) return `${(value / 1000000).toFixed(1)} mi`;
                            if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                            return value.toFixed(0);
                        }
                        return "";
                    },
                },
            },
            scales: { y: { beginAtZero: true } },
        },
    });
}

function updateMonthlyVvrChart(historicalData, selectedUnidades) {
    const selectorContainer = document.getElementById("monthly-chart-selector");
    const unitsToConsider = selectedUnidades.length > 0 ? selectedUnidades : [...new Set(allData.map((d) => d.nm_unidade))];
    const filteredHistoricalData = historicalData.filter((d) => unitsToConsider.includes(d.nm_unidade));
    
    const salesByYearMonth = {};
    const uniqueYears = [...new Set(filteredHistoricalData.map((d) => d.dt_cadastro_integrante.getFullYear()))].sort();

    if (selectorContainer.children.length === 0) {
        uniqueYears.forEach((year) => {
            const button = document.createElement("button");
            button.dataset.year = year;
            button.textContent = year;
            if (year >= uniqueYears[uniqueYears.length - 2]) { button.classList.add("active"); }
            selectorContainer.appendChild(button);
        });
        selectorContainer.querySelectorAll("button").forEach((button) => {
            button.addEventListener("click", () => {
                button.classList.toggle("active");
                updateDashboard();
            });
        });
    }

    const activeYears = Array.from(selectorContainer.querySelectorAll("button.active")).map((btn) => parseInt(btn.dataset.year));
    filteredHistoricalData.forEach((d) => {
        const year = d.dt_cadastro_integrante.getFullYear();
        const month = d.dt_cadastro_integrante.getMonth();
        if (!salesByYearMonth[year]) { salesByYearMonth[year] = Array(12).fill(0); }
        salesByYearMonth[year][month] += d.vl_plano;
    });

    const colors = ["#ffc107", "#007bff", "#6c757d", "#28a745", "#dc3545", "#17a2b8", "#fd7e14"];
    const datasets = uniqueYears.map((year, index) => ({
        label: year,
        data: salesByYearMonth[year] || Array(12).fill(0),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + "33",
        fill: true,
        tension: 0.1,
        hidden: !activeYears.includes(year),
    }));

    const monthLabels = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    if (monthlyVvrChart) monthlyVvrChart.destroy();
    monthlyVvrChart = new Chart(document.getElementById("monthlyVvrChart"), {
        type: "line",
        data: { labels: monthLabels, datasets: datasets },
        options: {
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || "";
                            if (label) { label += ": "; }
                            if (context.parsed.y !== null) { label += formatCurrency(context.parsed.y); }
                            return label;
                        },
                    },
                },
                datalabels: {
                    display: true, align: "top", offset: 8, backgroundColor: "rgba(52, 58, 64, 0.7)", borderRadius: 4, color: "white", font: { size: 14 }, padding: 4,
                    formatter: (value) => {
                        if (value > 0) {
                            if (value >= 1000000) return `${(value / 1000000).toFixed(1)} mi`;
                            if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                            return value.toFixed(0);
                        }
                        return "";
                    },
                },
            },
            scales: { y: { beginAtZero: true } },
        },
    });
}

function updateDrillDownCharts(filteredData) {
    const normalizeText = (text) => text?.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const salesByYear = {};

    // A função agora opera apenas sobre 'filteredData', que já é seguro.
    filteredData.forEach((d) => {
        const year = d.dt_cadastro_integrante.getFullYear();
        if (!salesByYear[year]) { salesByYear[year] = { vendas: 0, posVendas: 0 }; }
        if (normalizeText(d.venda_posvenda) === "VENDA") {
            salesByYear[year].vendas += d.vl_plano;
        } else if (normalizeText(d.venda_posvenda) === "POS VENDA") {
            salesByYear[year].posVendas += d.vl_plano;
        }
    });

    const years = Object.keys(salesByYear).sort((a, b) => a - b);
    const vendasAnual = years.map((year) => salesByYear[year].vendas);
    const posVendasAnual = years.map((year) => salesByYear[year].posVendas);

    if (yearlyStackedChart) yearlyStackedChart.destroy();
    yearlyStackedChart = new Chart(document.getElementById("yearlyStackedChart"), {
        type: "bar",
        data: {
            labels: years,
            datasets: [
                { label: "Pós Venda", data: posVendasAnual, backgroundColor: "#007bff" },
                { label: "Venda", data: vendasAnual, backgroundColor: "#6c757d" },
            ],
        },
        options: {
            devicePixelRatio: window.devicePixelRatio,
            maintainAspectRatio: false,
            indexAxis: "y",
            interaction: { mode: "y", intersect: false },
            scales: { x: { stacked: true }, y: { stacked: true } },
            plugins: {
                datalabels: {
                    color: "white", font: { weight: "bold" },
                    formatter: function (value) {
                        if (value === 0) return "";
                        if (value >= 1000000) return (value / 1000000).toFixed(1).replace(".0", "") + " M";
                        if (value >= 1000) return (value / 1000).toFixed(1).replace(".0", "") + "k";
                        return value;
                    },
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || "";
                            if (label) { label += ": "; }
                            if (context.parsed.x !== null) { label += formatCurrency(context.parsed.x); }
                            return label;
                        },
                        footer: function (tooltipItems) {
                            let sum = tooltipItems.reduce((acc, item) => acc + item.parsed.x, 0);
                            return "Total: " + formatCurrency(sum);
                        },
                    },
                },
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const clickedYear = years[elements[0].index];
                    drawMonthlyDetailChart(filteredData, clickedYear);
                }
            },
        },
    });

    // Lógica para limpar ou desenhar o gráfico mensal
    if (years.length > 0) {
        drawMonthlyDetailChart(filteredData, years[years.length - 1]);
    } else {
        // Se não há dados, chama a função com um array vazio para limpar o gráfico mensal
        drawMonthlyDetailChart([], new Date().getFullYear());
    }
}
function displayLastUpdateMessage() {
    const today = new Date();
    today.setHours(today.getHours() - 3);
    const dayOfWeek = today.getDay();
    let displayDate = new Date(today);
    if (dayOfWeek === 0) { displayDate.setDate(today.getDate() - 2); }
    else if (dayOfWeek === 6) { displayDate.setDate(today.getDate() - 1); }
    const formattedDate = `${String(displayDate.getDate()).padStart(2, "0")}/${String(displayDate.getMonth() + 1).padStart(2, "0")}/${displayDate.getFullYear()}`;
    const message = `Última Atualização: ${formattedDate} 08:30`;
    const messageElement = document.getElementById("last-update-message");
    if (messageElement) { messageElement.textContent = message; }
}

function drawMonthlyDetailChart(data, year) {
    document.getElementById("monthly-stacked-title").textContent = `Venda Realizada Total Mensal (${year})`;
    const salesByMonth = Array(12).fill(0).map(() => ({ vendas: 0, posVendas: 0 }));
    
    const normalizeText = (text) => text?.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    data.forEach((d) => {
        if (d.dt_cadastro_integrante.getFullYear() === parseInt(year)) {
            const month = d.dt_cadastro_integrante.getMonth();
            if (normalizeText(d.venda_posvenda) === "VENDA") {
                salesByMonth[month].vendas += d.vl_plano;
            } else if (normalizeText(d.venda_posvenda) === "POS VENDA") {
                salesByMonth[month].posVendas += d.vl_plano;
            }
        }
    });

    const vendasMensal = salesByMonth.map((m) => m.vendas);
    const posVendasMensal = salesByMonth.map((m) => m.posVendas);
    const monthLabels = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

    if (monthlyStackedChart) monthlyStackedChart.destroy();
    monthlyStackedChart = new Chart(document.getElementById("monthlyStackedChart"), {
        type: "bar",
        data: {
            labels: monthLabels,
            datasets: [
                { label: "Pós Venda", data: posVendasMensal, backgroundColor: "#007bff" },
                { label: "Venda", data: vendasMensal, backgroundColor: "#6c757d" },
            ],
        },
        options: {
            devicePixelRatio: window.devicePixelRatio,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            scales: { x: { stacked: true }, y: { stacked: true } },
            plugins: {
                datalabels: {
                    color: "white", font: { weight: "bold" },
                    formatter: function (value) {
                        if (value === 0) return "";
                        if (value >= 1000000) return (value / 1000000).toFixed(1).replace(".0", "") + " M";
                        if (value >= 1000) return (value / 1000).toFixed(0) + "k";
                        return value;
                    },
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || "";
                            if (label) { label += ": "; }
                            if (context.parsed.y !== null) { label += formatCurrency(context.parsed.y); }
                            return label;
                        },
                        footer: function (tooltipItems) {
                            let sum = tooltipItems.reduce((acc, item) => acc + item.parsed.y, 0);
                            return "Total: " + formatCurrency(sum);
                        },
                    },
                },
            },
        },
    });
}

function updateTicketCharts(filteredData) {
    const ticketByYear = {};
    // A função agora opera apenas sobre 'filteredData', que já é seguro.
    filteredData.forEach((d) => {
        const year = d.dt_cadastro_integrante.getFullYear();
        if (!ticketByYear[year]) { ticketByYear[year] = { totalValor: 0, totalAdesoes: 0 }; }
        ticketByYear[year].totalValor += d.vl_plano;
        ticketByYear[year].totalAdesoes += 1;
    });

    const years = Object.keys(ticketByYear).sort();
    const annualTicketData = years.map((year) => {
        const data = ticketByYear[year];
        return data.totalAdesoes > 0 ? data.totalValor / data.totalAdesoes : 0;
    });

    if (yearlyTicketChart) yearlyTicketChart.destroy();
    yearlyTicketChart = new Chart(document.getElementById("yearlyTicketChart"), {
        type: "bar",
        data: {
            labels: years,
            datasets: [{ label: "Ticket Médio", data: annualTicketData, backgroundColor: "#17a2b8" }],
        },
        options: {
            maintainAspectRatio: false,
            indexAxis: "y",
            plugins: {
                datalabels: {
                    anchor: "end", align: "end", color: "white", font: { weight: "bold" },
                    formatter: (value) => (value > 0 ? formatCurrency(value) : ""),
                },
                tooltip: { callbacks: { label: (context) => `Ticket Médio: ${formatCurrency(context.parsed.x)}` } },
            },
            scales: { x: { beginAtZero: true, afterDataLimits: (scale) => { scale.max *= 1.2; } } },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const clickedYear = years[elements[0].index];
                    drawMonthlyTicketChart(filteredData, clickedYear);
                }
            },
        },
    });

    // Lógica para limpar ou desenhar o gráfico mensal
    if (years.length > 0) {
        drawMonthlyTicketChart(filteredData, years[years.length - 1]);
    } else {
        // Se não há dados, chama a função com um array vazio para limpar o gráfico mensal
        drawMonthlyTicketChart([], new Date().getFullYear());
    }
}

function drawMonthlyTicketChart(data, year) {
    document.getElementById("monthly-ticket-title").textContent = `Ticket Médio Mensal (${year})`;
    const ticketByMonth = Array(12).fill(0).map(() => ({ totalValor: 0, totalAdesoes: 0 }));

    data.forEach((d) => {
        if (d.dt_cadastro_integrante.getFullYear() === parseInt(year)) {
            const month = d.dt_cadastro_integrante.getMonth();
            ticketByMonth[month].totalValor += d.vl_plano;
            ticketByMonth[month].totalAdesoes += 1;
        }
    });

    const monthlyTicketData = ticketByMonth.map((m) => (m.totalAdesoes > 0 ? m.totalValor / m.totalAdesoes : 0));
    const monthLabels = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    const maxValue = Math.max(...monthlyTicketData);

    if (monthlyTicketChart) monthlyTicketChart.destroy();
    monthlyTicketChart = new Chart(document.getElementById("monthlyTicketChart"), {
        type: "bar",
        data: {
            labels: monthLabels,
            datasets: [{ label: "Ticket Médio", data: monthlyTicketData, backgroundColor: "#17a2b8" }],
        },
        options: {
            maintainAspectRatio: false,
            plugins: {
                datalabels: {
                    anchor: "end", align: "end", color: "white", font: { weight: "bold" },
                    formatter: (value) => (value > 0 ? formatCurrency(value) : ""),
                },
                tooltip: { callbacks: { label: (context) => `Ticket Médio: ${formatCurrency(context.parsed.y)}` } },
            },
            scales: { y: { beginAtZero: true, max: maxValue > 0 ? maxValue * 1.2 : undefined } },
        },
    });
}

function updateContractsCharts(filteredData) {
    const contractsByYear = {};
    // Aplicar apenas os filtros de unidade e curso, ignorando o filtro de data
    const selectedUnidades = $("#unidade-filter").val() || [];
    const selectedCursos = $("#curso-filter").val() || [];
    
    fundosData.filter(d => {
        const unidadeMatch = selectedUnidades.length === 0 || selectedUnidades.includes(d.nm_unidade);
        const cursoMatch = selectedCursos.length === 0 || (d.curso_fundo && selectedCursos.includes(d.curso_fundo));
        return unidadeMatch && cursoMatch;
    }).forEach((d) => {
        const year = d.dt_contrato.getFullYear();
        if (!contractsByYear[year]) { contractsByYear[year] = 0; }
        contractsByYear[year]++;
    });

    const years = Object.keys(contractsByYear).sort().filter((year) => parseInt(year) >= 2019);
    const annualContractsData = years.map((year) => contractsByYear[year]);

    if (yearlyContractsChart) yearlyContractsChart.destroy();
    yearlyContractsChart = new Chart(document.getElementById("yearlyContractsChart"), {
        type: "bar",
        data: {
            labels: years,
            datasets: [{ label: "Contratos", data: annualContractsData, backgroundColor: "#28a745" }],
        },
        options: {
            maintainAspectRatio: false,
            indexAxis: "y",
            plugins: {
                datalabels: {
                    anchor: "end", align: "end", color: "white", font: { weight: "bold" },
                    formatter: (value) => value.toLocaleString("pt-BR"),
                },
                tooltip: { callbacks: { label: (context) => `Contratos: ${context.parsed.x.toLocaleString("pt-BR")}` } },
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const clickedYear = years[elements[0].index];
                    drawMonthlyContractsChart(filteredData, clickedYear);
                }
            },
        },
    });

    // Lógica para limpar ou desenhar o gráfico mensal
    if (years.length > 0) {
        drawMonthlyContractsChart(filteredData, years[years.length - 1]);
    } else {
        // Se não há dados, chama a função com um array vazio para limpar o gráfico mensal
        drawMonthlyContractsChart([], new Date().getFullYear());
    }
}

function drawMonthlyContractsChart(data, year) {
    document.getElementById("monthly-contracts-title").textContent = `Contratos Realizados Total Mensal (${year})`;
    const contractsByMonth = Array(12).fill(0);

    // Aplicar apenas os filtros de unidade e curso, ignorando o filtro de data
    const selectedUnidades = $("#unidade-filter").val() || [];
    const selectedCursos = $("#curso-filter").val() || [];
    
    fundosData.filter(d => {
        const unidadeMatch = selectedUnidades.length === 0 || selectedUnidades.includes(d.nm_unidade);
        const cursoMatch = selectedCursos.length === 0 || (d.curso_fundo && selectedCursos.includes(d.curso_fundo));
        return unidadeMatch && cursoMatch && d.dt_contrato.getFullYear() === parseInt(year);
    }).forEach((d) => {
        const month = d.dt_contrato.getMonth();
        contractsByMonth[month]++;
    });

    const monthLabels = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    if (monthlyContractsChart) monthlyContractsChart.destroy();
    monthlyContractsChart = new Chart(document.getElementById("monthlyContractsChart"), {
        type: "bar",
        data: {
            labels: monthLabels,
            datasets: [{ label: "Contratos", data: contractsByMonth, backgroundColor: "#28a745" }],
        },
        options: {
            maintainAspectRatio: false,
            plugins: {
                datalabels: {
                    anchor: "end", align: "end", color: "white", font: { weight: "bold" },
                    formatter: (value) => (value > 0 ? value.toLocaleString("pt-BR") : ""),
                },
                tooltip: { callbacks: { label: (context) => `Contratos: ${context.parsed.y.toLocaleString("pt-BR")}` } },
            },
            scales: { y: { beginAtZero: true } },
        },
    });
}

function updateDataTable(data) {
    const tableData = data.map((d) => {
        const normalizeText = (text) => text?.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        let realizado = 0;
        let meta = 0;
        const vendasDoPeriodo = allData.filter((v) => v.nm_unidade === d.unidade && `${v.dt_cadastro_integrante.getFullYear()}-${String(v.dt_cadastro_integrante.getMonth() + 1).padStart(2, "0")}` === d.periodo);
        
        if (currentTableDataType === "vendas") {
            realizado = vendasDoPeriodo.filter((v) => normalizeText(v.venda_posvenda) === "VENDA").reduce((sum, v) => sum + v.vl_plano, 0);
            meta = d.meta_vvr_vendas;
        } else if (currentTableDataType === "posvendas") {
            realizado = vendasDoPeriodo.filter((v) => normalizeText(v.venda_posvenda) === "POS VENDA").reduce((sum, v) => sum + v.vl_plano, 0);
            meta = d.meta_vvr_posvendas;
        } else {
            realizado = d.realizado_vvr;
            meta = d.meta_vvr_total;
        }
        const atingimentoVvr = meta > 0 ? realizado / meta : 0;
        // Função para formatar a data de YYYY-MM para mmm/YYYY
        const formatPeriodo = (periodo) => {
            const [ano, mes] = periodo.split('-');
            const date = new Date(ano, parseInt(mes) - 1);
            const mesAbreviado = date.toLocaleDateString('pt-BR', { month: 'short' })
                .replace('.', '')  // Remove o ponto do mês abreviado
                .toLowerCase();    // Deixa em minúsculo
            return `${mesAbreviado}/${ano}`;
        };

        return [d.unidade, formatPeriodo(d.periodo), formatCurrency(realizado), formatCurrency(meta), formatPercent(atingimentoVvr)];
    }).sort((a, b) => String(a[1]).localeCompare(String(b[0])));

    if (dataTable) {
        dataTable.clear().rows.add(tableData).draw();
    } else {
        // Define os títulos das colunas com base no tipo de dados selecionado
        const getTipo = () => {
            switch(currentTableDataType) {
                case "vendas": return "(Vendas)";
                case "posvendas": return "(Pós-Venda)";
                default: return "(Total)";
            }
        };
        
        dataTable = $("#dados-table").DataTable({
            data: tableData,
            pageLength: 10,
            columns: [
                { title: "Unidade" },
                { title: "Período" },
                { title: `VVR Realizado ${getTipo()}` },
                { title: `Meta VVR ${getTipo()}` },
                { title: `Atingimento VVR ${getTipo()}` }
            ],
            language: { url: "//cdn.datatables.net/plug-ins/1.13.6/i18n/pt-BR.json" },
            destroy: true,
            dom: "Bfrtip",
            buttons: [{
                extend: "excelHtml5", text: "Exportar para Excel", title: `Relatorio_Vendas_${new Date().toLocaleDateString("pt-BR")}`, className: "excel-button",
                exportOptions: {
                    format: {
                        body: function (data, row, column, node) {
                            if (column === 2 || column === 3) { return parseFloat(data.replace("R$", "").replace(/\./g, "").replace(",", ".").trim()); }
                            if (column === 4) { return parseFloat(data.replace("%", "").replace(",", ".").trim()) / 100; }
                            // Mantém a formatação da data para o Excel
                            if (column === 1) { return data; }
                            return data;
                        },
                    },
                },
            }],
        });
    }
}

function addEventListeners() {
    document.getElementById("start-date").addEventListener("change", updateDashboard);
    document.getElementById("end-date").addEventListener("change", updateDashboard);

    document.querySelectorAll(".page-navigation button").forEach((button) => {
        button.addEventListener("click", function () {
            document.querySelectorAll(".page-navigation button").forEach((btn) => btn.classList.remove("active"));
            this.classList.add("active");
            document.querySelectorAll(".page-content").forEach((page) => page.classList.remove("active"));
            document.getElementById(this.dataset.page).classList.add("active");
        });
    });

    document.querySelectorAll("#chart-vvr-mes-section .chart-selector button").forEach((button) => {
        button.addEventListener("click", () => {
            document.querySelectorAll("#chart-vvr-mes-section .chart-selector button").forEach((btn) => btn.classList.remove("active"));
            button.classList.add("active");
            currentVvrChartType = button.dataset.type;
            updateDashboard();
        });
    });
    
    document.querySelectorAll("#table-section .chart-selector button").forEach((button) => {
        button.addEventListener("click", () => {
            const scrollPosition = window.scrollY;
            document.querySelectorAll("#table-section .chart-selector button").forEach((btn) => btn.classList.remove("active"));
            button.classList.add("active");
            currentTableDataType = button.dataset.type;
            // Destruir e recriar a tabela para atualizar os títulos das colunas
            if (dataTable) {
                dataTable.destroy();
                dataTable = null;
            }
            updateDataTable(currentFilteredDataForTable);
            window.scrollTo(0, scrollPosition);
        });
    });
}

// Função para atualizar filtros dependentes quando as unidades mudam
function updateDependentFilters(selectedUnidades = []) {
    console.log('updateDependentFilters called with:', selectedUnidades);
    const cursoFilter = $("#curso-filter");
    const fundoFilter = $("#fundo-filter");
    
    // Destruir instâncias existentes
    try {
        cursoFilter.multiselect('destroy');
        fundoFilter.multiselect('destroy');
    } catch(e) {
        console.log("Multiselect de filtros dependentes não existia ainda");
    }
    
    // Limpar opções
    cursoFilter.empty();
    fundoFilter.empty();
    
    // Determinar quais unidades usar para filtrar
    let unidadesFiltradas = [];
    if (userAccessLevel === "ALL_UNITS") {
        unidadesFiltradas = selectedUnidades.length > 0 ? selectedUnidades : [...new Set([...allData.map(d => d.nm_unidade), ...fundosData.map(d => d.nm_unidade)])];
    } else if (Array.isArray(userAccessLevel)) {
        unidadesFiltradas = selectedUnidades.length > 0 ? selectedUnidades.filter(u => userAccessLevel.includes(u)) : userAccessLevel;
    } else {
        unidadesFiltradas = [userAccessLevel];
    }
    
    // Filtrar dados com base nas unidades
    const dadosFiltrados = allData.filter(d => unidadesFiltradas.includes(d.nm_unidade));
    const fundosFiltrados = fundosData.filter(d => unidadesFiltradas.includes(d.nm_unidade));
    
    // Popular filtro de cursos
    const cursosVendas = dadosFiltrados.map((d) => d.curso_fundo || '').filter(c => c && c !== 'N/A');
    const cursosFundos = fundosFiltrados.map((d) => d.curso_fundo || '').filter(c => c && c !== 'N/A');
    const cursos = [...new Set([...cursosVendas, ...cursosFundos])].sort();
    
    cursos.forEach((c) => {
        cursoFilter.append($("<option>", { value: c, text: c }));
    });
    
    // Popular filtro de fundos
    const fundosFromVendas = dadosFiltrados.map((d) => d.nm_fundo || '').filter(f => f && f !== 'N/A');
    const fundosFromFundos = fundosFiltrados.map((d) => d.nm_fundo || '').filter(f => f && f !== 'N/A');
    const fundosUnicos = [...new Set([...fundosFromVendas, ...fundosFromFundos])].sort();
    
    fundosUnicos.forEach((f) => {
        fundoFilter.append($("<option>", { value: f, text: f }));
    });
    
    // Recriar multiselects para cursos
    cursoFilter.multiselect({
        enableFiltering: true,
        includeSelectAllOption: true,
        selectAllText: "Marcar todos",
        filterPlaceholder: "Pesquisar...",
        nonSelectedText: "Todos os cursos",
        nSelectedText: "cursos",
        allSelectedText: "Todos selecionados",
        buttonWidth: "100%",
        maxHeight: 300,
        onChange: updateDashboard,
        onSelectAll: updateDashboard,
        onDeselectAll: updateDashboard,
        enableCaseInsensitiveFiltering: true,
        filterBehavior: 'text',
        dropUp: false,
        dropRight: false,
        widthSynchronizationMode: 'ifPopupIsSmaller',
        templates: {
            button: '<button type="button" class="multiselect dropdown-toggle" data-toggle="dropdown"><span class="multiselect-selected-text"></span></button>',
            ul: '<ul class="multiselect-container dropdown-menu" style="width: auto; min-width: 100%;"></ul>'
        }
    });
    
    // Recriar multiselects para fundos
    fundoFilter.multiselect({
        enableFiltering: true,
        includeSelectAllOption: true,
        selectAllText: "Marcar todos",
        filterPlaceholder: "Pesquisar...",
        nonSelectedText: "Todos os fundos",
        nSelectedText: "fundos",
        allSelectedText: "Todos selecionados",
        buttonWidth: "100%",
        maxHeight: 300,
        onChange: updateDashboard,
        onSelectAll: updateDashboard,
        onDeselectAll: updateDashboard,
        enableCaseInsensitiveFiltering: true,
        filterBehavior: 'text',
        dropUp: false,
        dropRight: false,
        widthSynchronizationMode: 'ifPopupIsSmaller',
        closeOnSelect: false,
        templates: {
            button: '<button type="button" class="multiselect dropdown-toggle" data-toggle="dropdown"><span class="multiselect-selected-text"></span></button>',
            ul: '<ul class="multiselect-container dropdown-menu" style="width: auto; min-width: 100%;"></ul>',
            filter: '<li class="multiselect-item filter"><div class="input-group"><input class="form-control multiselect-search" type="text"></div></li>',
            filterClearBtn: '<span class="input-group-btn"><button class="btn btn-default multiselect-clear-filter" type="button"><i class="fas fa-times"></i></button></span>'
        }
    });
}

// Arquivo: script.js (do Dashboard de Vendas)

// ...

function populateFilters(selectedUnidades = []) {
    console.log('populateFilters called with:', selectedUnidades);
    console.log('userAccessLevel:', userAccessLevel);
    console.log('allData length:', allData.length);
    console.log('fundosData length:', fundosData.length);
    
    // Destruir instâncias existentes do multiselect
    try {
        $("#unidade-filter").multiselect('destroy');
        $("#curso-filter").multiselect('destroy');
        $("#fundo-filter").multiselect('destroy');
    } catch(e) {
        console.log("Multiselect não existia ainda:", e);
    }

    const unidadeFilter = $("#unidade-filter");
    const cursoFilter = $("#curso-filter");
    const fundoFilter = $("#fundo-filter");
    
    console.log('jQuery found unidade filter?', unidadeFilter.length > 0);
    console.log('Multiselect plugin available?', typeof unidadeFilter.multiselect === 'function');
    
    if (unidadeFilter.length === 0) {
        console.error('Elemento #unidade-filter não encontrado!');
        return;
    }
    
    if (typeof unidadeFilter.multiselect !== 'function') {
        console.error('Plugin multiselect não está disponível!');
        return;
    }
    
    // Limpa apenas os filtros dependentes
    cursoFilter.empty();
    fundoFilter.empty();

    if (userAccessLevel === "ALL_UNITS") {
        // Popula o filtro de unidades apenas uma vez
        if (unidadeFilter.find('option').length === 0) {
            const unidadesVendas = allData.map((d) => d.nm_unidade);
            const unidadesFundos = fundosData.map((d) => d.nm_unidade);
            const unidades = [...new Set([...unidadesVendas, ...unidadesFundos])].sort();
            unidades.forEach((u) => {
                unidadeFilter.append($("<option>", { value: u, text: u }));
            });
        }

        // Filtra os dados com base nas unidades selecionadas
        const unidadesFiltradas = selectedUnidades.length > 0 ? selectedUnidades : [...new Set(allData.map(d => d.nm_unidade), ...fundosData.map(d => d.nm_unidade))];
        
        const dadosFiltrados = allData.filter(d => unidadesFiltradas.includes(d.nm_unidade));
        const fundosFiltrados = fundosData.filter(d => unidadesFiltradas.includes(d.nm_unidade));

        // Populate cursos filter
        const cursosVendas = dadosFiltrados.map((d) => d.curso_fundo || '').filter(c => c && c !== 'N/A');
        const cursosFundos = fundosFiltrados.map((d) => d.curso_fundo || '').filter(c => c && c !== 'N/A');
        const cursos = [...new Set([...cursosVendas, ...cursosFundos])].sort();
        
        cursos.forEach((c) => {
            cursoFilter.append($("<option>", { value: c, text: c }));
        });

        // Populate fundos filter
        const fundosFromVendas = dadosFiltrados.map((d) => d.nm_fundo || '').filter(f => f && f !== 'N/A');
        const fundosFromFundos = fundosFiltrados.map((d) => d.nm_fundo || '').filter(f => f && f !== 'N/A');
        const fundosUnicos = [...new Set([...fundosFromVendas, ...fundosFromFundos])].sort();
        
        fundosUnicos.forEach((f) => {
            fundoFilter.append($("<option>", { value: f, text: f }));
        });

        // Recria os multiselects
        setTimeout(() => {
            unidadeFilter.multiselect({
                enableFiltering: true,
                includeSelectAllOption: true,
                selectAllText: "Marcar todos",
                filterPlaceholder: "Pesquisar...",
                nonSelectedText: "Todas as unidades",
                nSelectedText: "unidades",
                allSelectedText: "Todas selecionadas",
                buttonWidth: "100%",
                maxHeight: 300,
                onChange: function(option, checked) {
                    console.log('Unidade onChange triggered:', option.val(), checked);
                    const selectedOptions = $('#unidade-filter').val() || [];
                    console.log('Selected unidades:', selectedOptions);
                    updateDependentFilters(selectedOptions);
                    updateDashboard();
                },
                onSelectAll: function() {
                    console.log('Unidade onSelectAll triggered');
                    const selectedOptions = $('#unidade-filter').val() || [];
                    console.log('All selected unidades:', selectedOptions);
                    updateDependentFilters(selectedOptions);
                    updateDashboard();
                },
                onDeselectAll: function() {
                    console.log('Unidade onDeselectAll triggered');
                    updateDependentFilters([]);
                    updateDashboard();
                },
                enableCaseInsensitiveFiltering: true,
                filterBehavior: 'text',
                dropUp: false,
                dropRight: false,
                widthSynchronizationMode: 'ifPopupIsSmaller',
                closeOnSelect: false,
                templates: {
                    ul: '<ul class="multiselect-container dropdown-menu" style="width: auto; min-width: 100%;"></ul>'
                }
            });
        }, 50);

        cursoFilter.multiselect({
            enableFiltering: true,
            includeSelectAllOption: true,
            selectAllText: "Marcar todos",
            filterPlaceholder: "Pesquisar...",
            nonSelectedText: "Todos os cursos",
            nSelectedText: "cursos",
            allSelectedText: "Todos selecionados",
            buttonWidth: "100%",
            maxHeight: 300,
            onChange: updateDashboard,
            onSelectAll: updateDashboard,
            onDeselectAll: updateDashboard,
            enableCaseInsensitiveFiltering: true,
            filterBehavior: 'text',
            dropUp: false,
            dropRight: false,
            widthSynchronizationMode: 'ifPopupIsSmaller',
            templates: {
                button: '<button type="button" class="multiselect dropdown-toggle" data-toggle="dropdown"><span class="multiselect-selected-text"></span></button>',
                ul: '<ul class="multiselect-container dropdown-menu" style="width: auto; min-width: 100%;"></ul>'
            }
        });



        // Inicialização do multiselect para fundos
        fundoFilter.multiselect({
            enableFiltering: true,
            includeSelectAllOption: true,
            selectAllText: "Marcar todos",
            filterPlaceholder: "Pesquisar...",
            nonSelectedText: "Todos os fundos",
            nSelectedText: "fundos",
            allSelectedText: "Todos selecionados",
            buttonWidth: "100%",
            maxHeight: 300,
            onChange: updateDashboard,
            onSelectAll: updateDashboard,
            onDeselectAll: updateDashboard,
            enableCaseInsensitiveFiltering: true,
            filterBehavior: 'text',
            dropUp: false,
            dropRight: false,
            widthSynchronizationMode: 'ifPopupIsSmaller',
            closeOnSelect: false,
            templates: {
                button: '<button type="button" class="multiselect dropdown-toggle" data-toggle="dropdown"><span class="multiselect-selected-text"></span></button>',
                ul: '<ul class="multiselect-container dropdown-menu" style="width: auto; min-width: 100%;"></ul>',
                filter: '<li class="multiselect-item filter"><div class="input-group"><input class="form-control multiselect-search" type="text"></div></li>',
                filterClearBtn: '<span class="input-group-btn"><button class="btn btn-default multiselect-clear-filter" type="button"><i class="fas fa-times"></i></button></span>'
            }
        });

    } else if (Array.isArray(userAccessLevel)) {
        // CENÁRIO 2: MULTI-FRANQUEADO (vê apenas as suas unidades, mas pode selecionar)
        console.log('Setting up multi-franchise filter for:', userAccessLevel);
        userAccessLevel.forEach((u) => {
            unidadeFilter.append($("<option>", { value: u, text: u, selected: true }));
        });

        setTimeout(() => {
            unidadeFilter.multiselect({
                enableFiltering: true,
                includeSelectAllOption: true,
                selectAllText: "Marcar todas",
                filterPlaceholder: "Pesquisar...",
                nonSelectedText: "Nenhuma unidade",
                nSelectedText: "unidades",
                allSelectedText: "Todas as minhas unidades",
                buttonWidth: "100%",
                maxHeight: 300,
                onChange: function(option, checked) {
                    console.log('Multi-franchise onChange:', option.val(), checked);
                    updateDashboard();
                },
                onSelectAll: function() {
                    console.log('Multi-franchise onSelectAll');
                    updateDashboard();
                },
                onDeselectAll: function() {
                    console.log('Multi-franchise onDeselectAll');
                    updateDashboard();
                },
                enableCaseInsensitiveFiltering: true, // Habilita pesquisa case-insensitive
                filterBehavior: 'text' // Pesquisa no texto visível, não no valor
            });
        }, 50);

    } else {
        // CENÁRIO 3: FRANQUEADO DE UNIDADE ÚNICA (filtro travado)
        console.log('Setting up single-franchise filter for:', userAccessLevel);
        unidadeFilter.append($("<option>", { value: userAccessLevel, text: userAccessLevel, selected: true }));
        setTimeout(() => {
            unidadeFilter.multiselect({
                buttonWidth: "100%",
            });
            unidadeFilter.multiselect('disable');
        }, 50);

        // Filtrar dados apenas da unidade do usuário
        const dadosUnidade = allData.filter(d => d.nm_unidade === userAccessLevel);
        const fundosUnidade = fundosData.filter(d => d.nm_unidade === userAccessLevel);

        // Popular filtro de cursos
        const cursosUnidade = [...new Set([
            ...dadosUnidade.map(d => d.curso_fundo || ''),
            ...fundosUnidade.map(d => d.curso_fundo || '')
        ])].filter(c => c && c !== 'N/A').sort();

        cursosUnidade.forEach(c => {
            cursoFilter.append($("<option>", { value: c, text: c }));
        });

        // Popular filtro de fundos
        const fundosDisponiveis = [...new Set([
            ...dadosUnidade.map(d => d.nm_fundo || ''),
            ...fundosUnidade.map(d => d.nm_fundo || '')
        ])].filter(f => f && f !== 'N/A').sort();

        fundosDisponiveis.forEach(f => {
            fundoFilter.append($("<option>", { value: f, text: f }));
        });

        // Configurar multiselect para cursos
        cursoFilter.multiselect({
            enableFiltering: true,
            includeSelectAllOption: true,
            selectAllText: "Marcar todos",
            filterPlaceholder: "Pesquisar...",
            nonSelectedText: "Todos os cursos",
            nSelectedText: "cursos",
            allSelectedText: "Todos selecionados",
            buttonWidth: "100%",
            maxHeight: 300,
            onChange: updateDashboard,
            onSelectAll: updateDashboard,
            onDeselectAll: updateDashboard,
            enableCaseInsensitiveFiltering: true,
            filterBehavior: 'text',
            dropUp: false,
            dropRight: false,
            widthSynchronizationMode: 'ifPopupIsSmaller',
            templates: {
                button: '<button type="button" class="multiselect dropdown-toggle" data-toggle="dropdown"><span class="multiselect-selected-text"></span></button>',
                ul: '<ul class="multiselect-container dropdown-menu" style="width: auto; min-width: 100%;"></ul>'
            }
        });

        // Configurar multiselect para fundos
        fundoFilter.multiselect({
            enableFiltering: true,
            includeSelectAllOption: true,
            selectAllText: "Marcar todos",
            filterPlaceholder: "Pesquisar...",
            nonSelectedText: "Todos os fundos",
            nSelectedText: "fundos",
            allSelectedText: "Todos selecionados",
            buttonWidth: "100%",
            maxHeight: 300,
            onChange: updateDashboard,
            onSelectAll: updateDashboard,
            onDeselectAll: updateDashboard,
            enableCaseInsensitiveFiltering: true,
            filterBehavior: 'text',
            dropUp: false,
            dropRight: false,
            widthSynchronizationMode: 'ifPopupIsSmaller',
            templates: {
                button: '<button type="button" class="multiselect dropdown-toggle" data-toggle="dropdown"><span class="multiselect-selected-text"></span></button>',
                ul: '<ul class="multiselect-container dropdown-menu" style="width: auto; min-width: 100%;"></ul>'
            }
        });
    }

    // Define as datas padrão
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    document.getElementById("start-date").value = inicioMes.toISOString().split("T")[0];
    document.getElementById("end-date").value = fimMes.toISOString().split("T")[0];
}

// ...

function updateMonthlyAdesoesChart(filteredData) {
    const selectorContainer = document.getElementById("adesoes-chart-selector");
    
    const adesoesByYearMonth = {};
    // A função agora opera apenas sobre 'filteredData', que já é seguro.
    filteredData.forEach((d) => {
        const year = d.dt_cadastro_integrante.getFullYear();
        const month = d.dt_cadastro_integrante.getMonth();
        if (!adesoesByYearMonth[year]) { adesoesByYearMonth[year] = Array(12).fill(0); }
        adesoesByYearMonth[year][month]++;
    });

    const uniqueYears = Object.keys(adesoesByYearMonth).sort();

    // CORREÇÃO: Só cria os botões se eles ainda não existirem.
    if (selectorContainer.children.length === 0 && uniqueYears.length > 0) {
        const currentYear = new Date().getFullYear();
        uniqueYears.forEach((year) => {
            const button = document.createElement("button");
            button.dataset.year = year;
            button.textContent = year;
            // Seleciona os dois últimos anos por padrão na primeira carga
            if (parseInt(year) >= currentYear - 1) { 
                button.classList.add("active"); 
            }
            selectorContainer.appendChild(button);
        });
        // Adiciona o evento de clique a todos os botões criados
        selectorContainer.querySelectorAll("button").forEach((button) => {
            button.addEventListener("click", () => {
                button.classList.toggle("active");
                updateDashboard(); // Re-renderiza o dashboard com a nova seleção de anos
            });
        });
    }

    const activeYears = Array.from(selectorContainer.querySelectorAll("button.active")).map((btn) => parseInt(btn.dataset.year));
    const colors = ["#6c757d", "#28a745", "#dc3545", "#ffc107", "#007bff", "#17a2b8", "#fd7e14"];
    const datasets = uniqueYears.map((year, index) => ({
        label: year,
        data: adesoesByYearMonth[year] || Array(12).fill(0),
        backgroundColor: colors[index % colors.length],
        hidden: !activeYears.includes(parseInt(year)),
    }));

    const monthLabels = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    if (monthlyAdesoesChart) monthlyAdesoesChart.destroy();
    monthlyAdesoesChart = new Chart(document.getElementById("monthlyAdesoesChart"), {
        type: "bar",
        data: { labels: monthLabels, datasets: datasets },
        options: {
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || "";
                            if (label) { label += ": "; }
                            if (context.parsed.y !== null) { label += context.parsed.y; }
                            return label;
                        },
                    },
                },
                datalabels: {
                    display: true, align: "center", anchor: "center", color: "#FFFFFF", font: { size: 14, weight: "bold" },
                    formatter: (value) => (value > 0 ? value : ""),
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: function (value) { return value >= 1000 ? value / 1000 + " mil" : value; } },
                },
            },
        },
    });
}

function updateAdesoesDrillDownCharts(filteredData) {
    const normalizeText = (text) => text?.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const adesoesByYear = {};
    
    // A função agora opera apenas sobre 'filteredData', que já é seguro.
    filteredData.forEach((d) => {
        const year = d.dt_cadastro_integrante.getFullYear();
        if (!adesoesByYear[year]) { adesoesByYear[year] = { vendas: 0, posVendas: 0 }; }
        if (normalizeText(d.venda_posvenda) === "VENDA") {
            adesoesByYear[year].vendas++;
        } else if (normalizeText(d.venda_posvenda) === "POS VENDA") {
            adesoesByYear[year].posVendas++;
        }
    });

    const years = Object.keys(adesoesByYear).sort();
    const adesoesVendasAnual = years.map((year) => adesoesByYear[year].vendas);
    const adesoesPosVendasAnual = years.map((year) => adesoesByYear[year].posVendas);

    if (yearlyAdesoesStackedChart) yearlyAdesoesStackedChart.destroy();
    yearlyAdesoesStackedChart = new Chart(document.getElementById("yearlyAdesoesStackedChart"), {
        type: "bar",
        data: {
            labels: years,
            datasets: [
                { label: "Pós Venda", data: adesoesPosVendasAnual, backgroundColor: "#007bff" },
                { label: "Venda", data: adesoesVendasAnual, backgroundColor: "#6c757d" },
            ],
        },
        options: {
            devicePixelRatio: window.devicePixelRatio,
            interaction: { mode: "y", intersect: false },
            maintainAspectRatio: false,
            indexAxis: "y",
            scales: { x: { stacked: true }, y: { stacked: true } },
            plugins: {
                datalabels: {
                    color: "white", font: { weight: "bold" },
                    formatter: (value) => (value > 0 ? value : ""),
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || "";
                            if (label) { label += ": "; }
                            if (context.parsed.x !== null) { label += context.parsed.x; }
                            return label;
                        },
                        footer: function (tooltipItems) {
                            let sum = tooltipItems.reduce((acc, item) => acc + item.parsed.x, 0);
                            return "Total: " + sum;
                        },
                    },
                },
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const clickedYear = years[elements[0].index];
                    drawMonthlyAdesoesDetailChart(filteredData, clickedYear);
                }
            },
        },
    });

    // Lógica para limpar ou desenhar o gráfico mensal
    if (years.length > 0) {
        drawMonthlyAdesoesDetailChart(filteredData, years[years.length - 1]);
    } else {
        drawMonthlyAdesoesDetailChart([], new Date().getFullYear());
    }
}

function drawMonthlyAdesoesDetailChart(data, year) {
    document.getElementById("monthly-adesoes-stacked-title").textContent = `Adesões por Tipo (Mensal ${year})`;
    const adesoesByMonth = Array(12).fill(0).map(() => ({ vendas: 0, posVendas: 0 }));
    
    const normalizeText = (text) => text?.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    data.forEach((d) => {
        if (d.dt_cadastro_integrante.getFullYear() === parseInt(year)) {
            const month = d.dt_cadastro_integrante.getMonth();
            if (normalizeText(d.venda_posvenda) === "VENDA") {
                adesoesByMonth[month].vendas++;
            } else if (normalizeText(d.venda_posvenda) === "POS VENDA") {
                adesoesByMonth[month].posVendas++;
            }
        }
    });

    const adesoesVendasMensal = adesoesByMonth.map((m) => m.vendas);
    const adesoesPosVendasMensal = adesoesByMonth.map((m) => m.posVendas);
    const monthLabels = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

    if (monthlyAdesoesStackedChart) monthlyAdesoesStackedChart.destroy();
    monthlyAdesoesStackedChart = new Chart(document.getElementById("monthlyAdesoesStackedChart"), {
        type: "bar",
        data: {
            labels: monthLabels,
            datasets: [
                { label: "Pós Venda", data: adesoesPosVendasMensal, backgroundColor: "#007bff" },
                { label: "Venda", data: adesoesVendasMensal, backgroundColor: "#6c757d" },
            ],
        },
        options: {
            devicePixelRatio: window.devicePixelRatio,
            interaction: { mode: "index", intersect: false },
            maintainAspectRatio: false,
            scales: { x: { stacked: true }, y: { stacked: true } },
            plugins: {
                datalabels: {
                    color: "white", font: { weight: "bold" },
                    formatter: (value) => (value > 0 ? value : ""),
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || "";
                            if (label) { label += ": "; }
                            if (context.parsed.y !== null) { label += context.parsed.y; }
                            return label;
                        },
                        footer: function (tooltipItems) {
                            let sum = tooltipItems.reduce((acc, item) => acc + item.parsed.y, 0);
                            return "Total: " + sum;
                        },
                    },
                },
            },
        },
    });
}

function updateConsultorTable(filteredData) {
    const performanceMap = new Map();
    filteredData.forEach((d) => {
        const key = `${d.nm_unidade}-${d.indicado_por}`;
        if (!performanceMap.has(key)) {
            performanceMap.set(key, {
                unidade: d.nm_unidade,
                consultor: d.indicado_por,
                vvr_total: 0,
                total_adesoes: 0,
            });
        }
        const entry = performanceMap.get(key);
        entry.vvr_total += d.vl_plano;
        entry.total_adesoes += 1;
    });

    const tableData = Array.from(performanceMap.values()).map((item) => [item.unidade, item.consultor, formatCurrency(item.vvr_total), item.total_adesoes]);

    if (consultorDataTable) {
        consultorDataTable.clear().rows.add(tableData).draw();
    } else {
        consultorDataTable = $("#consultor-table").DataTable({
            data: tableData,
            pageLength: 10,
            language: { url: "//cdn.datatables.net/plug-ins/1.13.6/i18n/pt-BR.json" },
            destroy: true,
            dom: "Bfrtip",
            buttons: [{
                extend: "excelHtml5", text: "Exportar para Excel", title: `Relatorio_Consultores_${new Date().toLocaleDateString("pt-BR")}`, className: "excel-button",
                exportOptions: {
                    format: {
                        body: function (data, row, column, node) {
                            if (column === 2) { return parseFloat(String(data).replace("R$", "").replace(/\./g, "").replace(",", ".").trim()); }
                            if (column === 3) { return Number(data); }
                            return data;
                        },
                    },
                },
            }],
        });
    }
}

function updateDetalhadaAdesoesTable(filteredData) {
    const tableData = filteredData.map((d) => [
        d.nm_unidade,
        d.codigo_integrante,
        d.nm_integrante,
        d.dt_cadastro_integrante.toLocaleDateString("pt-BR"),
        d.id_fundo,
        d.venda_posvenda,
        d.indicado_por,
        d.vl_plano,
    ]);

    if (detalhadaAdesoesDataTable) {
        detalhadaAdesoesDataTable.clear().rows.add(tableData).draw();
    } else {
        detalhadaAdesoesDataTable = $("#detalhada-adesoes-table").DataTable({
            data: tableData,
            columns: [null, null, null, null, null, null, null, { render: (data) => formatCurrency(data) }],
            pageLength: 10,
            language: { url: "//cdn.datatables.net/plug-ins/1.13.6/i18n/pt-BR.json" },
            destroy: true,
            dom: "Bfrtip",
            buttons: [{
                extend: "excelHtml5", text: "Exportar para Excel", title: `Relatorio_Adesoes_Detalhadas_${new Date().toLocaleDateString("pt-BR")}`, className: "excel-button",
                exportOptions: {
                    format: {
                        body: function (data, row, column, node) {
                            if (column === 7) { return parseFloat(String(data).replace("R$", "").replace(/\./g, "").replace(",", ".").trim()); }
                            return data;
                        },
                    },
                },
            }],
        });
    }
}

function updateFundosDetalhadosTable(fundosData, selectedUnidades, startDate, endDate) {
    const filteredData = fundosData.filter((d) => {
        const isUnitMatch = selectedUnidades.length === 0 || selectedUnidades.includes(d.nm_unidade);
        const isDateMatch = d.dt_contrato >= startDate && d.dt_contrato < endDate;
        return isUnitMatch && isDateMatch;
    });

    const tableData = filteredData.map((d) => [
        d.nm_unidade,
        d.id_fundo,
        d.nm_fundo,
        formatDate(d.dt_contrato),
        formatDate(d.dt_cadastro),
        d.tipo_servico,
        d.instituicao,
        formatDate(d.dt_baile),
    ]);

    if (fundosDetalhadosDataTable) {
        fundosDetalhadosDataTable.clear().rows.add(tableData).draw();
    } else {
        fundosDetalhadosDataTable = $("#fundos-detalhados-table").DataTable({
            data: tableData,
            pageLength: 10,
            language: { url: "//cdn.datatables.net/plug-ins/1.13.6/i18n/pt-BR.json" },
            destroy: true,
            dom: "Bfrtip",
            buttons: [{
                extend: "excelHtml5", text: "Exportar para Excel", title: `Relatorio_Fundos_Detalhados_${new Date().toLocaleDateString("pt-BR")}`, className: "excel-button",
            }],
        });
    }
}

// --- FUNÇÃO PARA ATUALIZAR INDICADORES DO FUNIL ---
function updateFunilIndicators(startDate, endDate, selectedUnidades) {
    console.log("=== INÍCIO updateFunilIndicators ===");
    console.log("Parâmetros recebidos:");
    console.log("- startDate:", startDate);
    console.log("- endDate:", endDate);
    console.log("- selectedUnidades:", selectedUnidades);
    console.log("- funilData total:", funilData ? funilData.length : 0, "registros");
    
    if (!funilData || funilData.length === 0) {
        console.log("❌ Sem dados do funil para processar");
        // Zerar todos os cards
        document.getElementById("funil-total-leads").textContent = "0";
        document.getElementById("funil-qualificados").textContent = "0";
        document.getElementById("funil-propostas").textContent = "0";
        document.getElementById("funil-propostas-enviadas").textContent = "0";
        document.getElementById("funil-contratos-fechados").textContent = "0";
        document.getElementById("funil-leads-perdidos").textContent = "0";
        document.getElementById("funil-leads-desqualificados").textContent = "0";
        return;
    }
    
    console.log("✅ Dados disponíveis:", funilData.length, "registros");
    
    // Função para converter data DD/MM/YYYY para objeto Date
    const parseDate = (dateString) => {
        if (!dateString || typeof dateString !== 'string') return null;
        const parts = dateString.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (parts) {
            return new Date(parts[3], parts[2] - 1, parts[1]); // ano, mês-1, dia
        }
        return null;
    };
    
    // PASSO 1: FILTRAR POR PERÍODO DE DATA
    let dadosFiltradosPorData = funilData.filter(item => {
        if (!item.criado_em) {
            return false; // Excluir itens sem data
        }
        
        const dataItem = parseDate(item.criado_em);
        if (!dataItem) {
            console.log("⚠️ Data inválida:", item.criado_em);
            return false;
        }
        
        // Verificar se a data está dentro do período
        const dentroIntervalo = dataItem >= startDate && dataItem < endDate;
        
        if (dentroIntervalo) {
            console.log("✅ Data válida:", {
                titulo: item.titulo,
                data: item.criado_em,
                dataParsed: dataItem,
                unidade: item.nm_unidade
            });
        }
        
        return dentroIntervalo;
    });
    
    console.log(`📅 Dados após filtro de data (${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}):`, dadosFiltradosPorData.length, "registros");
    
    // PASSO 2: FILTRAR POR UNIDADE (se selecionadas)
    let dadosFinaisFiltrados = dadosFiltradosPorData;
    
    if (selectedUnidades && selectedUnidades.length > 0) {
        console.log("🔍 Filtrando por unidades:", selectedUnidades);
        
        dadosFinaisFiltrados = dadosFiltradosPorData.filter(item => {
            const unidadeItem = item.nm_unidade;
            if (!unidadeItem) {
                console.log("⚠️ Item sem unidade:", item);
                return false;
            }
            
            const pertenceUnidade = selectedUnidades.includes(unidadeItem);
            return pertenceUnidade;
        });
        
        console.log("📊 Dados após filtro de unidade:", dadosFinaisFiltrados.length, "registros");
    } else {
        console.log("📊 Mantendo todos os dados (sem filtro de unidade)");
    }
    
    // PASSO 3: CONTAR LINHAS com título válido (não vazio)
    const leadsValidos = dadosFinaisFiltrados.filter(item => {
        return item.titulo && item.titulo.trim() !== '';
    });
    
    const totalLeads = leadsValidos.length;
    console.log("📊 Total de leads no período filtrado:", totalLeads);
    
    // Mostrar amostra dos dados contados
    if (leadsValidos.length > 0) {
        console.log("🔍 Amostra dos leads contados:");
        leadsValidos.slice(0, 5).forEach((item, index) => {
            console.log(`  ${index + 1}. Título: "${item.titulo}" | Unidade: "${item.nm_unidade}" | Criado: "${item.criado_em}"`);
        });
    }
    
    // PASSO 4: Atualizar o card principal
    const cardElement = document.getElementById("funil-total-leads");
    if (cardElement) {
        cardElement.textContent = totalLeads.toString();
        console.log("✅ Card 'Total de Leads Criados' atualizado com:", totalLeads);
    } else {
        console.error("❌ Elemento 'funil-total-leads' não encontrado");
    }
    
    // Por enquanto, outros cards ficam zerados
    const otherCards = [
        "funil-qualificados", "funil-propostas", "funil-propostas-enviadas",
        "funil-contratos-fechados", "funil-leads-perdidos", "funil-leads-desqualificados"
    ];
    
    otherCards.forEach(cardId => {
        const element = document.getElementById(cardId);
        if (element) {
            element.textContent = "0";
        }
    });
    
    console.log("=== FIM updateFunilIndicators ===");
}