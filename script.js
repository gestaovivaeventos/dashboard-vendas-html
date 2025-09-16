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
  fundosDetalhadosDataTable,
  negociacoesPorFaseChart, // NOVO: Chart de negociações por fase
  perdasPorFaseChart; // NOVO: Chart de perdas por fase
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
  console.log("🚀 INICIANDO DASHBOARD...");
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

      // ✅ GARANTIR POPULAÇÃO DOS FILTROS: Usar retry para garantir que dados estão prontos
      console.log('🔄 Iniciando população dos filtros após carregamento dos dados...');
      retryPopulateFilters();
      
      // 🆕 Aplicar visibilidade dos filtros específicos por página
      setTimeout(() => {
        applyFundosFilterVisibility();
        applyTipoAdesaoFilterVisibility();
        applyTipoServicoFilterVisibility();
        applyTipoClienteFilterVisibility();
        applyInstituicaoFilterVisibility();
      }, 500);
      
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
        const fundoIndex = headers.indexOf("nm_fundo");  // ✅ ADICIONAR busca do nm_fundo
        const cursoFundoIndex = headers.indexOf("curso_fundo");
        const tipoServicoIndex = headers.indexOf("tp_servico");
        const instituicaoIndex = headers.indexOf("nm_instituicao");
        const tipoClienteIndex = headers.indexOf("tipo_cliente");  // ✅ NOVO: coluna R

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
                nm_fundo: fundoIndex !== -1 ? row[fundoIndex] || "N/A" : "N/A",  // ✅ ADICIONAR campo nm_fundo
                curso_fundo: cursoFundoIndex !== -1 ? row[cursoFundoIndex] || "" : "",
                tp_servico: tipoServicoIndex !== -1 ? row[tipoServicoIndex] || "N/A" : "N/A",
                nm_instituicao: instituicaoIndex !== -1 ? row[instituicaoIndex] || "N/A" : "N/A",
                tipo_cliente: tipoClienteIndex !== -1 ? row[tipoClienteIndex] || "N/A" : "N/A",  // ✅ NOVO: tipo_cliente
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
    const tipoClienteIndex = headers.indexOf("tipo_cliente");  // ✅ NOVO: coluna Q
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
        tipo_cliente: tipoClienteIndex !== -1 ? row[tipoClienteIndex] || "N/A" : "N/A",  // ✅ NOVO: tipo_cliente
      };
    }).filter(Boolean);
  } catch (error) {
    console.error("Erro CRÍTICO ao buscar dados de fundos:", error);
    return [];
  }
}

async function fetchMetasData() {
  console.log("� fetchMetasData INICIADA!");
  console.log("�🔍 === INÍCIO fetchMetasData ===");
  if (!METAS_SPREADSHEET_ID || !METAS_SHEET_NAME || !API_KEY) {
    console.error("Configurações da planilha de metas incompletas.");
    return new Map();
  }
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${METAS_SPREADSHEET_ID}/values/${METAS_SHEET_NAME}!A:Z?key=${API_KEY}`;
  console.log('🔍 URL da API:', url);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error("Erro API Google Sheets:", await response.json());
      return new Map();
    }
    const data = await response.json();
    const rows = data.values || [];
    console.log(`🔍 Total de linhas recebidas: ${rows.length}`);
    
    // Debug: Mostrar as últimas 10 linhas recebidas
    console.log('🔍 ÚLTIMAS 10 LINHAS RECEBIDAS:');
    const ultimasLinhas = rows.slice(-10);
    ultimasLinhas.forEach((row, index) => {
      const linhaReal = rows.length - 10 + index + 1;
      console.log(`  Linha ${linhaReal}:`, row);
    });
    
    const metasMap = new Map();
    const headers = rows[0].map((h) => h.trim().toLowerCase());
    console.log('🔍 Headers encontrados:', headers);
    
    const unidadeIndex = headers.indexOf("nm_unidade"),
      anoIndex = headers.indexOf("ano"),
      mesIndex = headers.indexOf("mês"),
      metaVendasIndex = headers.indexOf("meta vvr_venda"),
      metaPosvendasIndex = headers.indexOf("meta vvr_pos_venda"),
      metaAdesoesIndex = headers.indexOf("meta adesões");

    console.log('🔍 Índices das colunas:');
    console.log(`  - nm_unidade: ${unidadeIndex}`);
    console.log(`  - ano: ${anoIndex}`);
    console.log(`  - mês: ${mesIndex}`);
    console.log(`  - meta vvr_venda: ${metaVendasIndex}`);
    console.log(`  - meta vvr_pos_venda: ${metaPosvendasIndex}`);

    let linhasProcessadas = 0;
    let vitoriaDaConquistaEncontrada = false;
    
    // Lista de unidades que deveriam estar mas não aparecem
    const unidadesPerdidas = ['cacoal', 'cuiaba', 'londrina', 'maceio', 'palmas', 'jose de campos', 'sete lagoas', 'vitoria da conquista'];
    const unidadesEncontradas = [];

    rows.slice(1).forEach((row, index) => {
      const unidade = row[unidadeIndex],
        ano = row[anoIndex],
        mes = String(row[mesIndex]).padStart(2, "0");
      
      // Debug específico para as unidades perdidas
      if (unidade) {
        const unidadeLower = unidade.toLowerCase();
        unidadesPerdidas.forEach(perdida => {
          if (unidadeLower.includes(perdida.split(' ')[0])) { // Busca pelo primeiro nome
            unidadesEncontradas.push({
              linha: index + 2,
              unidade: unidade,
              ano: ano,
              mes: mes,
              buscada: perdida
            });
            console.log(`🎯 UNIDADE PERDIDA ENCONTRADA: ${perdida} -> linha ${index + 2}: "${unidade}"`);
          }
        });
      }
      
      // Debug específico para Vitória da Conquista
      if (unidade && unidade.includes('Vitória da Conquista')) {
        vitoriaDaConquistaEncontrada = true;
        console.log(`🎯 VITÓRIA DA CONQUISTA ENCONTRADA na linha ${index + 2}:`);
        console.log(`  - unidade: "${unidade}"`);
        console.log(`  - ano: "${ano}"`);
        console.log(`  - mes: "${mes}"`);
        console.log(`  - row completa:`, row);
      }
      
      const parseMetaValue = (index) => parseFloat(String(row[index] || "0").replace(/\./g, "").replace(",", ".")) || 0;
      const metaVendas = parseMetaValue(metaVendasIndex),
        metaPosvendas = parseMetaValue(metaPosvendasIndex),
        metaAdesoes = parseInt(row[metaAdesoesIndex]) || 0;
      
      // 🆕 Debug: Verificar por que algumas linhas não são processadas
      const temUnidade = !!unidade;
      const temAno = !!ano;
      const temMes = !!mes;
      const deveProcessar = temUnidade && temAno && temMes;
      
      if (unidade && unidadesPerdidas.some(perdida => unidade.toLowerCase().includes(perdida.split(' ')[0]))) {
        console.log(`🔍 VALIDAÇÃO linha ${index + 2} (${unidade}):`);
        console.log(`  - unidade: "${unidade}" (válida: ${temUnidade})`);
        console.log(`  - ano: "${ano}" (válido: ${temAno})`);
        console.log(`  - mes: "${mes}" (válido: ${temMes})`);
        console.log(`  - deve processar: ${deveProcessar}`);
        console.log(`  - row:`, row);
      }
      
      if (deveProcessar) {
        const chave = `${unidade}-${ano}-${mes}`;
        metasMap.set(chave, {
          meta_vvr_vendas: metaVendas,
          meta_vvr_posvendas: metaPosvendas,
          meta_vvr_total: metaVendas + metaPosvendas,
          meta_adesoes: metaAdesoes,
        });
        linhasProcessadas++;
      }
    });
    
    console.log(`🔍 Linhas processadas: ${linhasProcessadas}`);
    console.log(`🔍 Total de metas carregadas: ${metasMap.size}`);
    console.log(`🔍 Vitória da Conquista encontrada: ${vitoriaDaConquistaEncontrada}`);
    
    // Resumo das unidades perdidas
    console.log('📊 RESUMO DAS UNIDADES PERDIDAS:');
    console.log(`  - Total buscadas: ${unidadesPerdidas.length}`);
    console.log(`  - Total encontradas: ${unidadesEncontradas.length}`);
    console.log('  - Unidades encontradas:', unidadesEncontradas);
    
    const naoEncontradas = unidadesPerdidas.filter(perdida => 
      !unidadesEncontradas.some(enc => enc.buscada === perdida)
    );
    console.log('  - Unidades NÃO encontradas:', naoEncontradas);
    
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
    const fasePerdidoIndex = 1; // Coluna B - Fase 7.2 Perdido
    const cursoIndex = 3; // Coluna D - Qual é o seu curso?
    const origemLeadIndex = 6; // Coluna G - Origem do Lead
    const criadoEmIndex = 12; // Coluna M - Data criação
    const qualificacaoComissaoIndex = 57; // Coluna BF - Primeira vez que entrou na fase 1.2 Qualificação Comissão
    const diagnosticoRealizadoIndex = 59; // Coluna BH - Primeira vez que entrou na fase 2.1 Diagnóstico Realizado
    const propostaEnviadaIndex = 61; // Coluna BJ - Primeira vez que entrou na fase 3.1 Proposta Enviada
    const fechamentoComissaoIndex = 64; // Coluna BM - Primeira vez que entrou na fase 4.1 Fechamento Comissão
    const concatMotivoPerdaIndex = 70; // Coluna BS - CONCAT MOTIVO PERDA
    const concatConcorrenteIndex = 71; // Coluna BT - CONCAT CONCORRENTE
    const consultorIndex = 53; // Coluna BB - Selecione o Consultor responsável por este Card
    const etiquetasIndex = 54; // Coluna BC - Etiquetas
    const segmentacaoLeadIndex = 69; // Coluna BR - Indique qual a segmentação desse potencial cliente
    
    // Índices das colunas de perdas por fase
    const perda11Index = 13; // Coluna N - (1.1) Venda Perdida?
    const perda12Index = 17; // Coluna R - (1.2) Venda Perdida?
    const perda13Index = 21; // Coluna V - (1.4) Venda Perdida? (1.3 Reunião Agendada)
    const perda21Index = 25; // Coluna Z - (2.1) Venda Perdida?
    const perda22Index = 29; // Coluna AD - (2.2) Venda Perdida?
    const perda31Index = 33; // Coluna AH - (3.1) Venda Perdida?
    const perda32Index = 37; // Coluna AL - (3.2) Venda Perdida?
    const perda33Index = 41; // Coluna AP - (3.3) Venda Perdida?
    const perda41Index = 45; // Coluna AT - (4.1) Venda Perdida?
    const perda51Index = 49; // Coluna AX - (5.1) Venda Perdida?
    
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
    
    console.log("Índices - Título:", tituloIndex, "Fase Perdido:", fasePerdidoIndex, "Curso:", cursoIndex, "Origem Lead:", origemLeadIndex, "Criado em:", criadoEmIndex, "Qualificação Comissão:", qualificacaoComissaoIndex, "Diagnóstico Realizado:", diagnosticoRealizadoIndex, "Proposta Enviada:", propostaEnviadaIndex, "Fechamento Comissão:", fechamentoComissaoIndex, "CONCAT Motivo Perda:", concatMotivoPerdaIndex, "CONCAT Concorrente:", concatConcorrenteIndex, "Unidade:", unidadeIndex);
    
    if (rows.length > 1) {
      console.log("Segunda linha como exemplo:", rows[1]);
      console.log("Título (A):", rows[1][tituloIndex]);
      console.log("Fase Perdido (B):", rows[1][fasePerdidoIndex]);
      console.log("Curso (D):", rows[1][cursoIndex]);
      console.log("Origem Lead (G):", rows[1][origemLeadIndex]);
      console.log("Criado em (M):", rows[1][criadoEmIndex]);
      console.log("Consultor (BB):", rows[1][consultorIndex]);
      
      // Debug específico da coluna D (curso)
      console.log("🔍 DEBUG COLUNA D (CURSO):");
      console.log("Header da coluna D:", headers[cursoIndex]);
      console.log("Índice da coluna curso:", cursoIndex);
      console.log("Valor na linha 2, coluna D:", rows[1][cursoIndex]);
      console.log("Primeiras 5 linhas da coluna D:");
      for (let i = 1; i <= Math.min(5, rows.length - 1); i++) {
        console.log(`  Linha ${i + 1}: "${rows[i][cursoIndex]}"`);
      }
      
      // Debug específico da coluna BB (consultor)
      console.log("🔍 DEBUG COLUNA BB (CONSULTOR):");
      console.log("Header da coluna BB:", headers[consultorIndex]);
      console.log("Índice da coluna consultor:", consultorIndex);
      console.log("Valor na linha 2, coluna BB:", rows[1][consultorIndex]);
      console.log("Primeiras 5 linhas da coluna BB:");
      for (let i = 1; i <= Math.min(5, rows.length - 1); i++) {
        console.log(`  Linha ${i + 1}: "${rows[i][consultorIndex]}"`);
      }
      
      console.log("Qualificação Comissão (BF):", rows[1][qualificacaoComissaoIndex]);
      console.log("Diagnóstico Realizado (BH):", rows[1][diagnosticoRealizadoIndex]);
      console.log("Proposta Enviada (BJ):", rows[1][propostaEnviadaIndex]);
      console.log("Fechamento Comissão (BM):", rows[1][fechamentoComissaoIndex]);
      console.log("CONCAT Motivo Perda (BS):", rows[1][concatMotivoPerdaIndex]);
      console.log("Unidade (BU):", rows[1][unidadeIndex]);
    }
    
    // Primeiro, processar todos os dados sem filtrar
    const allProcessedData = rows.slice(1).map((row, index) => ({
      id: index + 1,
      titulo: row[tituloIndex] || '',
      fase_perdido: row[fasePerdidoIndex] || '',
      curso: row[cursoIndex] || '', // Coluna D - Qual é o seu curso?
      consultor: row[consultorIndex] || '', // Coluna BB - Selecione o Consultor responsável por este Card
      etiquetas: row[etiquetasIndex] || '', // Coluna BC - Etiquetas
      origem_lead: row[origemLeadIndex] || '',
      segmentacao_lead: row[segmentacaoLeadIndex] || '', // Coluna BR - Indique qual a segmentação desse potencial cliente
      criado_em: row[criadoEmIndex] || '',
      qualificacao_comissao: row[qualificacaoComissaoIndex] || '',
      diagnostico_realizado: row[diagnosticoRealizadoIndex] || '',
      proposta_enviada: row[propostaEnviadaIndex] || '',
      fechamento_comissao: row[fechamentoComissaoIndex] || '',
      concat_motivo_perda: row[concatMotivoPerdaIndex] || '',
      concat_concorrente: row[concatConcorrenteIndex] || '',
      nm_unidade: row[unidadeIndex] || '',
      // Colunas de perdas por fase
      perda_11: row[perda11Index] || '',
      perda_12: row[perda12Index] || '',
      perda_13: row[perda13Index] || '',
      perda_21: row[perda21Index] || '',
      perda_22: row[perda22Index] || '',
      perda_31: row[perda31Index] || '',
      perda_32: row[perda32Index] || '',
      perda_33: row[perda33Index] || '',
      perda_41: row[perda41Index] || '',
      perda_51: row[perda51Index] || '',
      row_data: row
    }));
    
    console.log("📊 Total de linhas processadas (sem filtro):", allProcessedData.length);
    
    // Agora filtrar apenas os com título válido
    const processedData = allProcessedData.filter(item => item.titulo && item.titulo.trim() !== '');
    
    console.log("📊 Registros com título válido:", processedData.length);
    console.log("📊 Registros removidos por título vazio:", allProcessedData.length - processedData.length);
    
    // Debug: mostrar alguns registros sem título
    const semTitulo = allProcessedData.filter(item => !item.titulo || item.titulo.trim() === '');
    if (semTitulo.length > 0) {
      console.log("⚠️ Amostra de registros sem título (removidos):");
      semTitulo.slice(0, 3).forEach((item, index) => {
        console.log(`  ${index + 1}. Linha ${item.id}: título="${item.titulo}" | unidade="${item.nm_unidade}" | criado="${item.criado_em}"`);
      });
    }
    
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
  } catch (error) {
    console.error("❌ Erro CRÍTICO ao buscar dados do funil:", error);
    return [];
  }
}

function processAndCrossReferenceData(salesData, startDate, endDate) {
  // 🔄 Primeiro: Processar dados de vendas
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

  // 🆕 Segundo: Adicionar unidades que só têm metas (sem vendas) DENTRO DO PERÍODO
  if (metasData && metasData.size > 0 && startDate && endDate) {
    console.log('🔍 Adicionando unidades só com metas ao período:', startDate, 'até', endDate);
    
    metasData.forEach((meta, chaveMeta) => {
      if (!vendasPorMesUnidade[chaveMeta]) {
        // Extrair unidade e período da chave (formato: "Unidade-AAAA-MM")
        const lastDash = chaveMeta.lastIndexOf('-');
        if (lastDash !== -1) {
          const secondLastDash = chaveMeta.lastIndexOf('-', lastDash - 1);
          if (secondLastDash !== -1) {
            const unidade = chaveMeta.substring(0, secondLastDash);
            const periodo = chaveMeta.substring(secondLastDash + 1); // AAAA-MM
            
            // 🆕 Verificar se a meta está dentro do período selecionado
            const [ano, mes] = periodo.split('-');
            const metaDate = new Date(parseInt(ano), parseInt(mes) - 1, 1);
            
            if (metaDate >= startDate && metaDate < endDate) {
              console.log(`✅ Adicionando unidade só com meta: ${unidade} - ${periodo}`);
              vendasPorMesUnidade[chaveMeta] = {
                unidade: unidade,
                periodo: periodo,
                realizado_vvr: 0,
                realizado_adesoes: 0,
              };
            } else {
              console.log(`❌ Meta fora do período: ${unidade} - ${periodo} (${metaDate})`);
            }
          }
        }
      }
    });
  }

  // 🔄 Terceiro: Combinar vendas com metas
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

function updateMainKPIs(dataBruta, selectedUnidades, startDate, endDate, retryCount = 0) {
    console.log('🔍 updateMainKPIs called with:');
    console.log('  - selectedUnidades:', selectedUnidades);
    console.log('  - selectedUnidades length:', selectedUnidades.length);
    console.log('  - userAccessLevel:', userAccessLevel);
    console.log('  - startDate:', startDate);
    console.log('  - endDate:', endDate);
    console.log('  - retryCount:', retryCount);
    
    // 🆕 VALIDAÇÃO CRÍTICA: Não calcular se dados não estão prontos
    if (!metasData || metasData.size === 0) {
        if (retryCount < 10) { // Máximo 10 tentativas (1 segundo)
            console.log('⚠️ METAS NÃO CARREGADAS (vazia) - adiando cálculo...');
            setTimeout(() => {
                updateMainKPIs(dataBruta, selectedUnidades, startDate, endDate, retryCount + 1);
            }, 100);
            return;
        } else {
            console.warn('⚠️ TIMEOUT: Metas não carregaram após 10 tentativas - prosseguindo sem metas');
            // Prosseguir mesmo sem metas para não bloquear o dashboard
        }
    }
    
    // 🆕 VALIDAÇÃO ADICIONAL: Verificar se metas básicas foram carregadas
    if (metasData.size < 5) { // Esperamos pelo menos 5 metas (mais flexível)
        if (retryCount < 10) { // Reduzir tentativas para 10 (1 segundo)
            console.log(`⚠️ METAS INCOMPLETAS (${metasData.size} < 5) - adiando cálculo...`);
            setTimeout(() => {
                updateMainKPIs(dataBruta, selectedUnidades, startDate, endDate, retryCount + 1);
            }, 100);
            return;
        } else {
            console.warn(`⚠️ TIMEOUT: Só carregaram ${metasData.size} metas após 10 tentativas - prosseguindo mesmo assim`);
            // Prosseguir mesmo assim para não bloquear o dashboard
        }
    }
    
    console.log('✅ Dados validados - prosseguindo com cálculo de KPIs');
    console.log('  - metasData.size:', metasData.size);
    
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
    console.log('🔍 canCalculateMeta:', canCalculateMeta);

    if (canCalculateMeta) {
        // 🆕 CORREÇÃO: Para cálculo de metas, devemos incluir TODAS as unidades com meta,
        // não apenas as que têm vendas!
        let unitsToConsider;
        
        if (userAccessLevel === 'ALL_UNITS' && selectedUnidades.length === 0) {
            // Admin sem filtro: considera todas as unidades que têm META (não apenas vendas)
            const unidadesComMeta = [...new Set(Array.from(metasData.keys()).map(key => key.split("-")[0]))];
            const unidadesComVenda = [...new Set(allData.map(d => d.nm_unidade))];
            unitsToConsider = [...new Set([...unidadesComMeta, ...unidadesComVenda])];
            console.log('🔍 Admin sem filtro - unidades com META:', unidadesComMeta);
            console.log('🔍 Admin sem filtro - unidades com VENDA:', unidadesComVenda);
        } else {
            // Usuário específico ou admin com filtro: usa as unidades selecionadas
            unitsToConsider = selectedUnidades;
        }
        
        console.log('🔍 unitsToConsider FINAL:', unitsToConsider);
        console.log('🔍 unitsToConsider length:', unitsToConsider.length);
        
        // 🆕 Debug: Mostrar todas as unidades disponíveis
        const todasUnidades = [...new Set(allData.map(d => d.nm_unidade))];
        console.log('🔍 Todas as unidades disponíveis:', todasUnidades);
        console.log('🔍 Total de unidades disponíveis:', todasUnidades.length);

        // 🆕 Debug específico: Verificar dados de meta para Vitória da Conquista
        console.log('🔍 DEBUG VITÓRIA DA CONQUISTA:');
        console.log('  - Procurando por "Vitória da Conquista" em todasUnidades...');
        const vitoriaNasUnidades = todasUnidades.filter(u => 
            u.includes('Vitória') || u.includes('Conquista') || 
            u.toLowerCase().includes('vitoria') || u.toLowerCase().includes('conquista')
        );
        console.log('  - Unidades com "Vitória/Conquista":', vitoriaNasUnidades);
        
        console.log('  - Procurando por "Vitória da Conquista" em metasData...');
        const vitoriaNasMetas = [];
        metasData.forEach((metaInfo, key) => {
            const [unidade, ano, mes] = key.split("-");
            if (unidade.includes('Vitória') || unidade.includes('Conquista') || 
                unidade.toLowerCase().includes('vitoria') || unidade.toLowerCase().includes('conquista')) {
                vitoriaNasMetas.push({
                    key: key,
                    unidade: unidade,
                    ano: ano,
                    mes: mes,
                    metaVendas: metaInfo.meta_vvr_vendas,
                    metaPosVendas: metaInfo.meta_vvr_posvendas,
                    total: metaInfo.meta_vvr_vendas + metaInfo.meta_vvr_posvendas
                });
            }
        });
        // 🆕 Debug específico para Vitória da Conquista (com e sem acento)
        console.log('🔍 PROCURANDO VITORIA DA CONQUISTA (sem acento):');
        const vitoriaNasMetasSimplificado = [];
        metasData.forEach((metaInfo, key) => {
            const [unidade, ano, mes] = key.split("-");
            if (unidade.toLowerCase().includes('vitoria') && unidade.toLowerCase().includes('conquista')) {
                vitoriaNasMetasSimplificado.push({
                    key: key,
                    unidade: unidade,
                    total: metaInfo.meta_vvr_vendas + metaInfo.meta_vvr_posvendas
                });
                console.log(`🎯 ENCONTROU: ${key} = ${metaInfo.meta_vvr_vendas + metaInfo.meta_vvr_posvendas}`);
            }
        });
        console.log('🔍 Total de metas Vitoria da Conquista:', vitoriaNasMetasSimplificado.length);

        let metasEncontradas = 0;
        
        console.log('🔍 BUSCANDO METAS PARA UNIDADES SELECIONADAS:');
        
        metasData.forEach((metaInfo, key) => {
            const [unidade, ano, mes] = key.split("-");
            const metaDate = new Date(ano, parseInt(mes) - 1, 1);
            
            if (metaDate >= startDate && metaDate < endDate) {
                if (unitsToConsider.includes(unidade)) {
                    metaVendas += metaInfo.meta_vvr_vendas;
                    metaPosVendas += metaInfo.meta_vvr_posvendas;
                    metasEncontradas++;
                    console.log(`✅ Meta encontrada: ${unidade}-${ano}-${mes} = ${metaInfo.meta_vvr_vendas + metaInfo.meta_vvr_posvendas}`);
                }
            }
        });
        
        // 🆕 Debug: Verificar quais unidades NÃO têm meta
        console.log('❌ UNIDADES SEM META:');
        unitsToConsider.forEach(unit => {
            const temMeta = Array.from(metasData.keys()).some(key => {
                const [unidade, ano, mes] = key.split("-");
                const metaDate = new Date(ano, parseInt(mes) - 1, 1);
                return unidade === unit && metaDate >= startDate && metaDate < endDate;
            });
            
            if (!temMeta) {
                console.log(`  - "${unit}" não tem meta cadastrada no período`);
            }
        });
        
        console.log('🔍 Total de metas encontradas:', metasEncontradas);
        console.log('🔍 metaVendas:', metaVendas);
        console.log('🔍 metaPosVendas:', metaPosVendas);
    }
    // Se 'canCalculateMeta' for falso, as metas permanecerão 0.

    const metaTotal = metaVendas + metaPosVendas;
    console.log('🔍 RESULTADO FINAL:');
    console.log('  - metaTotal:', metaTotal);
    console.log('  - metaTotal formatado:', formatCurrency(metaTotal));
    
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
    console.log('🔍 updateDashboard called');
    const selectedUnidades = $("#unidade-filter").val() || [];
    console.log('🔍 Selected unidades in updateDashboard:', selectedUnidades);
    console.log('🔍 userAccessLevel:', userAccessLevel);
    console.log('🔍 Type of userAccessLevel:', typeof userAccessLevel);
    console.log('🔍 Is array?', Array.isArray(userAccessLevel));
    
    // 🆕 CORREÇÃO: Determinar selectedUnidades baseado no tipo de usuário
    let finalSelectedUnidades = selectedUnidades;
    
    if (userAccessLevel === 'ALL_UNITS') {
        // Admin: se não selecionou nada, usar TODAS as unidades (vendas + metas + fundos + funil)
        if (selectedUnidades.length === 0) {
            const unidadesVendas = [...new Set(allData.map(d => d.nm_unidade))];
            const unidadesMetas = Array.from(metasData.keys()).map(key => key.split("-")[0]);
            const unidadesFundos = [...new Set(fundosData.map(d => d.nm_unidade))];
            const unidadesFunil = funilData ? [...new Set(funilData.map(d => d.nm_unidade).filter(Boolean))] : [];
            
            // 🆕 CORREÇÃO CRÍTICA: Combinar TODAS as unidades
            finalSelectedUnidades = [...new Set([...unidadesVendas, ...unidadesMetas, ...unidadesFundos, ...unidadesFunil])];
            
            console.log('🔍 Admin sem seleção - TODAS as unidades:');
            console.log('  - Vendas:', unidadesVendas.length);
            console.log('  - Metas:', [...new Set(unidadesMetas)].length);
            console.log('  - Fundos:', unidadesFundos.length);
            console.log('  - Funil:', unidadesFunil.length);
            console.log('  - TOTAL FINAL:', finalSelectedUnidades.length);
        }
    } else if (Array.isArray(userAccessLevel)) {
        // Multi-franqueado: se não selecionou nada, usar suas unidades
        if (selectedUnidades.length === 0) {
            finalSelectedUnidades = userAccessLevel;
            console.log('🔍 Multi-franqueado sem seleção - usando suas unidades:', finalSelectedUnidades);
        }
    } else if (typeof userAccessLevel === 'string') {
        // Franqueado único: sempre usar sua unidade
        finalSelectedUnidades = [userAccessLevel];
        console.log('🔍 Franqueado único - usando sua unidade:', finalSelectedUnidades);
    }
    
    console.log('🔍 Final selectedUnidades para cálculos:', finalSelectedUnidades);
    
    const selectedCursos = $("#curso-filter").val() || [];
    const selectedFundos = $("#fundo-filter").val() || [];
    
    // 🆕 Detectar página ativa para aplicar filtros específicos
    let currentActivePage = 'page1';
    if (document.getElementById('btn-page1')?.classList.contains('active')) {
        currentActivePage = 'page1';
    } else if (document.getElementById('btn-page2')?.classList.contains('active')) {
        currentActivePage = 'page2';
    } else if (document.getElementById('btn-page3')?.classList.contains('active')) {
        currentActivePage = 'page3';
    }
    
    console.log('🔍 Página ativa detectada:', currentActivePage);
    console.log('🔍 Valor BRUTO do filtro de fundos:', selectedFundos);
    
    // 🚨 FILTRO DE FUNDOS - aplicar APENAS na página 2
    let selectedTipoAdesao, selectedTipoServico, selectedTipoCliente, selectedInstituicao, selectedFundosForFiltering;
    
    // 🔒 VERIFICAÇÃO ROBUSTA: SE NÃO ESTIVERMOS NA PÁGINA 2, FORÇAR FUNDOS VAZIO
    if (currentActivePage !== 'page2') {
        // 🛑 FORÇAR filtro de fundos como vazio nas páginas 1 e 3
        selectedFundosForFiltering = [];
        selectedTipoAdesao = [];
        selectedTipoServico = [];
        selectedTipoCliente = [];
        selectedInstituicao = [];
        console.log('🔍 🛑 PÁGINAS 1/3 - FORÇANDO filtro de fundos VAZIO (ignorando valor:', selectedFundos, ')');
    } else {
        // ✅ PÁGINA 2: Aplicar filtro de fundos + filtros específicos
        selectedTipoAdesao = $("#tipo-adesao-filter").val() || [];
        selectedTipoServico = $("#tipo-servico-filter").val() || [];
        selectedTipoCliente = $("#tipo-cliente-filter").val() || [];
        selectedInstituicao = $("#instituicao-filter").val() || [];
        selectedFundosForFiltering = selectedFundos; // APLICAR filtro de fundos na página 2
        console.log('🔍 ✅ PÁGINA 2 - aplicando filtro de fundos:', selectedFundos);
    }
    
    console.log('🔍 Filtros aplicados:');
    console.log('  - Unidades (sempre):', finalSelectedUnidades.length, finalSelectedUnidades);
    console.log('  - Cursos (sempre):', selectedCursos.length, selectedCursos);
    console.log('  - 🎯 FUNDOS (APENAS página 2) - filtrando por nm_fundo:', selectedFundosForFiltering.length, selectedFundosForFiltering);
    console.log('  - Página 2 específicos - TipoAdesao:', selectedTipoAdesao.length, 'TipoServico:', selectedTipoServico.length, 'Instituicao:', selectedInstituicao.length);
    
    // 🆕 DEBUG: Verificar se há dados com nm_fundo nos dados de adesões
    if (currentActivePage === 'page2' && selectedFundosForFiltering.length > 0) {
        // 🆕 DEBUG DETALHADO: Verificar estrutura real dos dados
        console.log('🔍 DEBUG ESTRUTURA DOS DADOS:');
        console.log('📋 ADESÕES - Exemplo de registro completo:', allData[0]);
        console.log('📋 ADESÕES - Campos relacionados a fundo:');
        console.log('  - nm_fundo:', allData[0]?.nm_fundo);
        console.log('  - curso_fundo:', allData[0]?.curso_fundo);
        
        const totalAdesoes = allData.length;
        const adesoesComNmFundo = allData.filter(d => d.nm_fundo && d.nm_fundo !== 'N/A' && d.nm_fundo.trim() !== '').length;
        const adesoesComCursoFundo = allData.filter(d => d.curso_fundo && d.curso_fundo !== 'N/A' && d.curso_fundo.trim() !== '').length;
        
        console.log('� CONTAGEM ADESÕES:');
        console.log('  - Total adesões:', totalAdesoes);
        console.log('  - Adesões com nm_fundo válido:', adesoesComNmFundo);
        console.log('  - Adesões com curso_fundo válido:', adesoesComCursoFundo);
        
        console.log('📝 EXEMPLOS nm_fundo (primeiros 10):');
        allData.slice(0, 10).forEach((d, i) => {
            console.log(`  [${i}] nm_fundo: "${d.nm_fundo}"`);
        });
        
        console.log('📝 EXEMPLOS curso_fundo (primeiros 10):');
        allData.slice(0, 10).forEach((d, i) => {
            console.log(`  [${i}] curso_fundo: "${d.curso_fundo}"`);
        });
        
        console.log('🎯 Filtro de fundos selecionado:', selectedFundosForFiltering);
    }
    
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
            const unidadeMatch = finalSelectedUnidades.length === 0 || finalSelectedUnidades.includes(d.nm_unidade);
            const cursoMatch = selectedCursos.length === 0 || (d.curso_fundo && selectedCursos.includes(d.curso_fundo));
            
            // ✅ FILTRO DE FUNDOS: usar nm_fundo (coluna F) para filtrar adesões
            const fundoMatch = selectedFundosForFiltering.length === 0 || 
                (d.nm_fundo && selectedFundosForFiltering.includes(d.nm_fundo));
            
            // Filtros específicos da página 2
            const tipoAdesaoMatch = selectedTipoAdesao.length === 0 || 
                (d.venda_posvenda && selectedTipoAdesao.includes(d.venda_posvenda.trim().toUpperCase()));
            
            const tipoServicoMatch = selectedTipoServico.length === 0 || 
                (d.tp_servico && selectedTipoServico.includes(d.tp_servico.trim().toUpperCase()));
            
            const tipoClienteMatch = selectedTipoCliente.length === 0 || 
                (d.tipo_cliente && selectedTipoCliente.includes(d.tipo_cliente.trim().toUpperCase()));
            
            const instituicaoMatch = selectedInstituicao.length === 0 || 
                (d.nm_instituicao && selectedInstituicao.includes(d.nm_instituicao.trim().toUpperCase()));
            
            return unidadeMatch && cursoMatch && fundoMatch && tipoAdesaoMatch && tipoServicoMatch && tipoClienteMatch && instituicaoMatch;
        };
        
        // Filtrar dados de adesões
        dataBrutaFiltrada = allData.filter(d => filterLogic(d) && d.dt_cadastro_integrante >= startDate && d.dt_cadastro_integrante < endDate);
        dataParaGraficoAnual = allData.filter(d => filterLogic(d) && d.dt_cadastro_integrante.getFullYear() === anoVigenteParaGrafico);
        allDataForOtherCharts = allData.filter(filterLogic);

        // ✅ Log simples para verificar filtro de fundos
        if (currentActivePage === 'page2' && selectedFundosForFiltering.length > 0) {
            console.log('🎯 FILTRO ATIVO | Fundos:', selectedFundosForFiltering.length, '| Dados antes:', allData.length, '| Dados depois:', allDataForOtherCharts.length);
        }

        // Filtrar dados de fundos usando dt_contrato
        fundosDataFiltrado = fundosData.filter(d => {
            const unidadeMatch = finalSelectedUnidades.length === 0 || finalSelectedUnidades.includes(d.nm_unidade);
            const cursoMatch = selectedCursos.length === 0 || (d.curso_fundo && selectedCursos.includes(d.curso_fundo));
            const fundoMatch = selectedFundosForFiltering.length === 0 || (d.nm_fundo && selectedFundosForFiltering.includes(d.nm_fundo));
            
            // 🆕 Filtros específicos da página 2 - arrays já estão vazios se não estivermos na página 2
            const tipoServicoMatch = selectedTipoServico.length === 0 || 
                (d.tipo_servico && selectedTipoServico.includes(d.tipo_servico.trim().toUpperCase()));
            
            const tipoClienteMatch = selectedTipoCliente.length === 0 || 
                (d.tipo_cliente && selectedTipoCliente.includes(d.tipo_cliente.trim().toUpperCase()));
            
            const instituicaoMatch = selectedInstituicao.length === 0 || 
                (d.instituicao && selectedInstituicao.includes(d.instituicao.trim().toUpperCase()));
            
            const dateMatch = d.dt_contrato && d.dt_contrato >= startDate && d.dt_contrato < endDate;
            return unidadeMatch && cursoMatch && fundoMatch && tipoServicoMatch && tipoClienteMatch && instituicaoMatch && dateMatch;
        });

        const sDPY = new Date(startDate); sDPY.setFullYear(sDPY.getFullYear() - 1);
        const eDPY = new Date(endDate); eDPY.setFullYear(eDPY.getFullYear() - 1);
        dataBrutaFiltradaPY = allData.filter(d => filterLogic(d) && d.dt_cadastro_integrante >= sDPY && d.dt_cadastro_integrante < eDPY);
    }
    
    // ATUALIZAÇÃO DOS COMPONENTES
    updateVvrVsMetaPorMesChart(dataParaGraficoAnual, anoVigenteParaGrafico);
    updateCumulativeVvrChart(allDataForOtherCharts, finalSelectedUnidades);
    updateMonthlyVvrChart(allDataForOtherCharts, finalSelectedUnidades);
    
    // ✅ CORREÇÃO CRÍTICA: Gráficos de adesões devem usar dados FILTRADOS
    updateMonthlyAdesoesChart(allDataForOtherCharts);  // allDataForOtherCharts já é filtrado pela filterLogic
    
    // Todas as chamadas abaixo estão corrigidas e seguras
    updateDrillDownCharts(allDataForOtherCharts);
    updateTicketCharts(allDataForOtherCharts);
    updateContractsCharts(); // 🆕 Sem parâmetro - faz própria filtragem sem período
    updateAdesoesDrillDownCharts(allDataForOtherCharts);  // ✅ CORREÇÃO: usar dados filtrados
    
    updateConsultorTable(dataBrutaFiltrada);
    updateDetalhadaAdesoesTable(dataBrutaFiltrada);
    updateFundosDetalhadosTable(fundosDataFiltrado, finalSelectedUnidades, startDate, endDate);
    updateFunilIndicators(startDate, endDate, finalSelectedUnidades);
    updateMainKPIs(dataBrutaFiltrada, finalSelectedUnidades, startDate, endDate);
    
    const dataAgregadaComVendas = processAndCrossReferenceData(dataBrutaFiltrada, startDate, endDate);
    currentFilteredDataForTable = dataAgregadaComVendas; 
    updateDataTable(dataAgregadaComVendas);
    
    document.getElementById("kpi-section-py").style.display = "block";
    updatePreviousYearKPIs(dataBrutaFiltradaPY, finalSelectedUnidades, startDate, endDate);
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

function updateContractsCharts() {
    const contractsByYear = {};
    
    // 🆕 FILTRAR DADOS DE FUNDOS PARA GRÁFICOS (sem filtro de período)
    const selectedUnidades = $("#unidade-filter").val() || [];
    const selectedCursos = $("#curso-filter").val() || [];
    const selectedFundos = $("#fundo-filter").val() || [];
    
    console.log('📊 updateContractsCharts - filtros base:');
    console.log('  - Unidades:', selectedUnidades);
    console.log('  - Cursos:', selectedCursos);
    console.log('  - Fundos BRUTO:', selectedFundos);
    
    // 🚨 FILTRO DE FUNDOS - aplicar APENAS na página 2
    let selectedTipoServico, selectedTipoCliente, selectedInstituicao, selectedFundosForCharts;
    
    const currentActivePage = document.getElementById('btn-page2')?.classList.contains('active') ? 'page2' : 'other';
    
    // 🔒 VERIFICAÇÃO ROBUSTA: SE NÃO ESTIVERMOS NA PÁGINA 2, FORÇAR FUNDOS VAZIO
    if (currentActivePage !== 'page2') {
        // 🛑 FORÇAR filtro de fundos como vazio nas páginas 1 e 3
        selectedTipoServico = [];
        selectedTipoCliente = [];
        selectedInstituicao = [];
        selectedFundosForCharts = [];
        console.log('📊 🛑 updateContractsCharts - PÁGINAS 1/3 - FORÇANDO fundos VAZIO (ignorando:', selectedFundos, ')');
    } else {
        // ✅ PÁGINA 2: Aplicar filtro de fundos + filtros específicos
        selectedTipoServico = $("#tipo-servico-filter").val() || [];
        selectedTipoCliente = $("#tipo-cliente-filter").val() || [];
        selectedInstituicao = $("#instituicao-filter").val() || [];
        selectedFundosForCharts = selectedFundos;
        console.log('📊 ✅ updateContractsCharts - PÁGINA 2 - aplicando filtro de fundos:', selectedFundos);
        console.log('  - Tipo Serviço:', selectedTipoServico);
        console.log('  - Tipo Cliente:', selectedTipoCliente);
        console.log('  - Instituição:', selectedInstituicao);
    }
    
    // Aplicar filtros SEM restrição de período
    console.log('📊 Total de dados de fundos antes do filtro:', fundosData.length);
    
    const fundosParaGraficos = fundosData.filter(d => {
        const unidadeMatch = selectedUnidades.length === 0 || selectedUnidades.includes(d.nm_unidade);
        const cursoMatch = selectedCursos.length === 0 || (d.curso_fundo && selectedCursos.includes(d.curso_fundo));
        const fundoMatch = selectedFundosForCharts.length === 0 || (d.nm_fundo && selectedFundosForCharts.includes(d.nm_fundo));
        
        const tipoServicoMatch = selectedTipoServico.length === 0 || 
            (d.tipo_servico && selectedTipoServico.includes(d.tipo_servico.trim().toUpperCase()));
        
        const tipoClienteMatch = selectedTipoCliente.length === 0 || 
            (d.tipo_cliente && selectedTipoCliente.includes(d.tipo_cliente.trim().toUpperCase()));
        
        const instituicaoMatch = selectedInstituicao.length === 0 || 
            (d.instituicao && selectedInstituicao.includes(d.instituicao.trim().toUpperCase()));
        
        return unidadeMatch && cursoMatch && fundoMatch && tipoServicoMatch && tipoClienteMatch && instituicaoMatch;
    });
    
    console.log('📊 updateContractsCharts - dados filtrados:', fundosParaGraficos.length, 'contratos');
    console.log('📊 Filtros aplicados - Unidades:', selectedUnidades.length, 'Cursos:', selectedCursos.length, 'Fundos:', selectedFundosForCharts.length, 'TipoServ:', selectedTipoServico.length, 'Inst:', selectedInstituicao.length);
    
    fundosParaGraficos.forEach((d) => {
        if (d.dt_contrato) {
            const year = d.dt_contrato.getFullYear();
            if (!contractsByYear[year]) { contractsByYear[year] = 0; }
            contractsByYear[year]++;
        }
    });

    const years = Object.keys(contractsByYear).sort().filter((year) => parseInt(year) >= 2019);
    const annualContractsData = years.map((year) => contractsByYear[year] || 0);

    console.log('📊 Dados anuais dos contratos:', contractsByYear);

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
                    drawMonthlyContractsChart(fundosParaGraficos, clickedYear);
                }
            },
        },
    });

    // Lógica para limpar ou desenhar o gráfico mensal
    if (years.length > 0) {
        drawMonthlyContractsChart(fundosParaGraficos, years[years.length - 1]);
    } else {
        // Se não há dados, chama a função com um array vazio para limpar o gráfico mensal
        drawMonthlyContractsChart([], new Date().getFullYear());
    }
}

function drawMonthlyContractsChart(data, year) {
    document.getElementById("monthly-contracts-title").textContent = `Contratos Realizados Total Mensal (${year})`;
    const contractsByMonth = Array(12).fill(0);

    // 🆕 USAR OS DADOS JÁ FILTRADOS (incluindo tipo serviço e instituição)
    console.log('📊 drawMonthlyContractsChart - usando dados filtrados para ano', year, ':', data.length, 'contratos');
    
    data.filter(d => d.dt_contrato && d.dt_contrato.getFullYear() === parseInt(year)).forEach((d) => {
        const month = d.dt_contrato.getMonth();
        contractsByMonth[month]++;
    });

    console.log('📊 Contratos por mês para', year, ':', contractsByMonth);

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
            const previousPage = document.querySelector(".page-navigation button.active")?.dataset.page;
            const newPage = this.dataset.page;
            
            console.log('🔄 Navegação de página:', previousPage, '→', newPage);
            
            // 🚨 LIMPAR FILTROS ESPECÍFICOS DA PÁGINA 2 **ANTES** DA MUDANÇA VISUAL
            if (previousPage === "page2" && newPage !== "page2") {
                console.log('🧹 Saindo da página 2 - limpando filtros específicos ANTES da mudança visual...');
                
                // 🆕 LIMPAR FILTRO DE FUNDOS FISICAMENTE
                console.log('🧹 🎯 LIMPANDO FILTRO DE FUNDOS...');
                $("#fundo-filter").val([]);
                try {
                    if ($("#fundo-filter").data('multiselect')) {
                        $("#fundo-filter").multiselect('refresh');
                        console.log('🧹 ✅ Filtro de FUNDOS limpo e atualizado');
                    }
                } catch (error) {
                    console.log('🧹 ❌ Erro ao limpar filtro de fundos:', error);
                }
                
                // Limpar seleções dos filtros específicos da página 2 SILENCIOSAMENTE
                $("#tipo-adesao-filter").val([]);
                $("#tipo-servico-filter").val([]);
                $("#tipo-cliente-filter").val([]);
                $("#instituicao-filter").val([]);
                
                // Atualizar o multiselect SILENCIOSAMENTE (sem triggers)
                try {
                    if ($("#tipo-adesao-filter").data('multiselect')) {
                        $("#tipo-adesao-filter").multiselect('refresh');
                    }
                    if ($("#tipo-servico-filter").data('multiselect')) {
                        $("#tipo-servico-filter").multiselect('refresh');
                    }
                    if ($("#tipo-cliente-filter").data('multiselect')) {
                        $("#tipo-cliente-filter").multiselect('refresh');
                    }
                    if ($("#instituicao-filter").data('multiselect')) {
                        $("#instituicao-filter").multiselect('refresh');
                    }
                    console.log('🧹 ✅ Filtros específicos limpos SILENCIOSAMENTE');
                } catch (error) {
                    console.log('🧹 Erro ao atualizar multiselects:', error);
                }
                
                // 🔄 ATUALIZAR DASHBOARD **ANTES** DA MUDANÇA VISUAL - SEM DELAY
                console.log('🔄 Atualizando dashboard ANTES da mudança visual...');
                updateDashboard();
            }
            
            // SÓ DEPOIS fazer a mudança visual das páginas
            document.querySelectorAll(".page-navigation button").forEach((btn) => btn.classList.remove("active"));
            this.classList.add("active");
            document.querySelectorAll(".page-content").forEach((page) => page.classList.remove("active"));
            document.getElementById(this.dataset.page).classList.add("active");
            
            // Recarregar os filtros sempre que mudar de/para a página do funil (page3)
            if ((previousPage === "page3" || newPage === "page3") && 
                previousPage !== newPage) {
                
                console.log('🔄 Mudança de página detectada:', previousPage, '→', newPage);
                
                // Pequeno delay para garantir que a mudança de página terminou
                setTimeout(() => {
                    console.log('🔄 Recarregando filtros após mudança de página...');
                    if (userAccessLevel === "ALL_UNITS") {
                        retryPopulateFilters();
                    } else if (Array.isArray(userAccessLevel)) {
                        retryUpdateDependentFilters(userAccessLevel);
                    } else {
                        // Para usuário único, recriar a lógica dos filtros
                        retryPopulateFilters();
                    }
                }, 100);
            }
            
            // 🆕 FORÇAR APLICAÇÃO DA VISIBILIDADE DOS FILTROS APÓS QUALQUER MUDANÇA DE PÁGINA
            setTimeout(() => {
                console.log('🔧 Aplicando visibilidade dos filtros após navegação...');
                applyFundosFilterVisibility();
                applyTipoAdesaoFilterVisibility();
                applyTipoServicoFilterVisibility();
                applyTipoClienteFilterVisibility();
                applyInstituicaoFilterVisibility();
                
                // 🆕 🎯 LIMPEZA ADICIONAL: Se entramos numa página que NÃO é a 2, garantir que fundos está vazio
                if (newPage !== "page2") {
                    console.log('🧹 🎯 LIMPEZA ADICIONAL: Entrando na página', newPage, '- garantindo que filtro de fundos está vazio...');
                    $("#fundo-filter").val([]);
                    try {
                        if ($("#fundo-filter").data('multiselect')) {
                            $("#fundo-filter").multiselect('refresh');
                            console.log('🧹 ✅ Filtro de fundos limpo após entrar na página', newPage);
                        }
                    } catch (error) {
                        console.log('🧹 ❌ Erro ao limpar filtro de fundos após mudança:', error);
                    }
                    
                    // Forçar atualização do dashboard após a limpeza
                    console.log('🔄 Forçando atualização do dashboard após limpeza...');
                    updateDashboard();
                }
            }, 200);
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

// 🆕 Função para aplicar visibilidade do filtro FUNDOS baseado na página ativa
function applyFundosFilterVisibility() {
    console.log('🔧 Aplicando visibilidade do filtro FUNDOS...');
    
    // Detectar página ativa
    let currentActivePage = null;
    if (document.getElementById('btn-page1')?.classList.contains('active')) {
        currentActivePage = 'page1';
    } else if (document.getElementById('btn-page2')?.classList.contains('active')) {
        currentActivePage = 'page2';
    } else if (document.getElementById('btn-page3')?.classList.contains('active')) {
        currentActivePage = 'page3';
    }
    
    const shouldShowFundos = (currentActivePage === 'page2');
    const fundoFilterContainer = document.getElementById('fundo-filter-container');
    const fundoFilter = $("#fundo-filter");
    
    console.log('🔧 applyFundosFilterVisibility - currentActivePage:', currentActivePage);
    console.log('🔧 applyFundosFilterVisibility - shouldShowFundos:', shouldShowFundos);
    
    if (fundoFilterContainer) {
        if (shouldShowFundos) {
            fundoFilterContainer.style.display = 'block';
            fundoFilterContainer.style.visibility = 'visible';
            console.log('🔧 ✅ FUNDOS FORÇADO PARA VISÍVEL');
            
            // 🆕 REINICIALIZAR MULTISELECT DO FUNDOS QUANDO FICAR VISÍVEL
            setTimeout(() => {
                console.log('🔧 Reinicializando multiselect do FUNDOS...');
                try {
                    // Destruir multiselect existente se houver
                    if (fundoFilter.data('multiselect')) {
                        fundoFilter.multiselect('destroy');
                        console.log('🔧 Multiselect FUNDOS destruído');
                    }
                    
                    // Recriar multiselect
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
                        filterBehavior: 'text'
                    });
                    console.log('🔧 ✅ Multiselect FUNDOS reinicializado com sucesso');
                } catch (error) {
                    console.error('🔧 ❌ Erro ao reinicializar multiselect FUNDOS:', error);
                }
            }, 100);
            
        } else {
            fundoFilterContainer.style.display = 'none';
            fundoFilterContainer.style.visibility = 'hidden';
            console.log('🔧 ✅ FUNDOS FORÇADO PARA OCULTO');
        }
    } else {
        console.log('🔧 ❌ fundoFilterContainer não encontrado');
    }
}

// 🆕 Função para controlar visibilidade do filtro Tipo de Adesão (só página 2)
function applyTipoAdesaoFilterVisibility() {
    // Determinar página ativa
    let currentActivePage = 'page1';
    if (document.getElementById('btn-page1')?.classList.contains('active')) {
        currentActivePage = 'page1';
    } else if (document.getElementById('btn-page2')?.classList.contains('active')) {
        currentActivePage = 'page2';
    } else if (document.getElementById('btn-page3')?.classList.contains('active')) {
        currentActivePage = 'page3';
    }
    
    const shouldShowTipoAdesao = (currentActivePage === 'page2');
    const tipoAdesaoFilterContainer = document.getElementById('tipo-adesao-filter-container');
    const tipoAdesaoFilter = $("#tipo-adesao-filter");
    
    console.log('🔧 applyTipoAdesaoFilterVisibility - currentActivePage:', currentActivePage);
    console.log('🔧 applyTipoAdesaoFilterVisibility - shouldShowTipoAdesao:', shouldShowTipoAdesao);
    console.log('🔧 applyTipoAdesaoFilterVisibility - allData disponível:', !!(allData && allData.length > 0));
    console.log('🔧 applyTipoAdesaoFilterVisibility - allData length:', allData ? allData.length : 'undefined');
    
    if (tipoAdesaoFilterContainer) {
        if (shouldShowTipoAdesao) {
            tipoAdesaoFilterContainer.style.display = 'block';
            tipoAdesaoFilterContainer.style.visibility = 'visible';
            console.log('🔧 ✅ TIPO ADESÃO FORÇADO PARA VISÍVEL');
            
            // 🆕 POPULAR FILTRO DE TIPO DE ADESÃO IMEDIATAMENTE
            setTimeout(() => {
                console.log('🔧 Populando filtro Tipo de Adesão DIRETAMENTE...');
                
                if (allData && allData.length > 0) {
                    tipoAdesaoFilter.empty();
                    
                    console.log('🔧 allData disponível, length:', allData.length);
                    console.log('🔧 Amostra allData (primeiros 3):', allData.slice(0, 3));
                    
                    // Verificar venda_posvenda na amostra
                    const amostraVendaPosvenda = allData.slice(0, 10).map(d => ({
                        unidade: d.nm_unidade,
                        venda_posvenda: d.venda_posvenda,
                        valor: d.vl_plano
                    }));
                    console.log('🔧 Amostra venda_posvenda em allData:', amostraVendaPosvenda);
                    
                    const tiposAdesao = allData
                        .map((d) => d.venda_posvenda || '')
                        .filter(t => t && t !== 'N/A' && t.trim() !== '')
                        .map(t => t.trim().toUpperCase());
                    
                    console.log('🔧 Tipos BRUTOS (primeiros 10):', tiposAdesao.slice(0, 10));
                    
                    const tiposAdesaoUnicos = [...new Set(tiposAdesao)].sort();
                    
                    console.log('🔧 Tipos ÚNICOS encontrados:', tiposAdesaoUnicos);
                    
                    tiposAdesaoUnicos.forEach((t) => {
                        tipoAdesaoFilter.append($("<option>", { value: t, text: t }));
                        console.log('🔧 Adicionando opção:', t);
                    });
                } else {
                    console.log('🔧 ❌ allData não disponível ainda');
                }
            }, 50);
            
            // 🆕 REINICIALIZAR MULTISELECT DO TIPO ADESÃO QUANDO FICAR VISÍVEL
            setTimeout(() => {
                console.log('🔧 Reinicializando multiselect do TIPO ADESÃO...');
                try {
                    // Destruir multiselect existente se houver
                    if (tipoAdesaoFilter.data('multiselect')) {
                        tipoAdesaoFilter.multiselect('destroy');
                    }
                    
                    // Recriar multiselect
                    tipoAdesaoFilter.multiselect({
                        includeSelectAllOption: true,
                        selectAllText: "Marcar todos",
                        allSelectedText: "Todos os tipos",
                        nonSelectedText: "Todos os tipos",
                        enableFiltering: false,
                        buttonWidth: '100%',
                        maxHeight: 300,
                        numberDisplayed: 2,
                        onChange: function(option, checked) {
                            console.log('🔧 Tipo Adesão filter changed:', option, 'checked:', checked);
                            // Só atualizar se estivermos na página 2
                            const currentPage = document.getElementById('btn-page2')?.classList.contains('active') ? 'page2' : 'other';
                            console.log('🔧 Página detectada no onChange:', currentPage);
                            if (currentPage === 'page2') {
                                console.log('🔧 ✅ Atualizando dashboard...');
                                updateDashboard();
                            } else {
                                console.log('🔧 ❌ Ignorando mudança de filtro - não estamos na página 2');
                            }
                        },
                        onSelectAll: function() {
                            console.log('🔧 Tipo Adesão - MARCAR TODOS acionado');
                            const currentPage = document.getElementById('btn-page2')?.classList.contains('active') ? 'page2' : 'other';
                            if (currentPage === 'page2') {
                                console.log('🔧 ✅ Atualizando dashboard (selectAll)...');
                                updateDashboard();
                            } else {
                                console.log('🔧 ❌ Ignorando selectAll - não estamos na página 2');
                            }
                        },
                        onDeselectAll: function() {
                            console.log('🔧 Tipo Adesão - DESMARCAR TODOS acionado');
                            const currentPage = document.getElementById('btn-page2')?.classList.contains('active') ? 'page2' : 'other';
                            if (currentPage === 'page2') {
                                console.log('🔧 ✅ Atualizando dashboard (deselectAll)...');
                                updateDashboard();
                            } else {
                                console.log('🔧 ❌ Ignorando deselectAll - não estamos na página 2');
                            }
                        }
                    });
                    console.log('🔧 ✅ Multiselect TIPO ADESÃO reinicializado com sucesso');
                } catch (error) {
                    console.error('🔧 ❌ Erro ao reinicializar multiselect TIPO ADESÃO:', error);
                }
            }, 100);
            
        } else {
            tipoAdesaoFilterContainer.style.display = 'none';
            tipoAdesaoFilterContainer.style.visibility = 'hidden';
            console.log('🔧 ✅ TIPO ADESÃO FORÇADO PARA OCULTO');
        }
    } else {
        console.log('🔧 ❌ tipoAdesaoFilterContainer não encontrado');
    }
}

// 🆕 Função para controlar visibilidade do filtro Tipo de Serviço (só página 2)
function applyTipoServicoFilterVisibility() {
    // Determinar página ativa
    let currentActivePage = 'page1';
    if (document.getElementById('btn-page1')?.classList.contains('active')) {
        currentActivePage = 'page1';
    } else if (document.getElementById('btn-page2')?.classList.contains('active')) {
        currentActivePage = 'page2';
    } else if (document.getElementById('btn-page3')?.classList.contains('active')) {
        currentActivePage = 'page3';
    }
    
    const shouldShowTipoServico = (currentActivePage === 'page2');
    const tipoServicoFilterContainer = document.getElementById('tipo-servico-filter-container');
    const tipoServicoFilter = $("#tipo-servico-filter");
    
    console.log('🔧 applyTipoServicoFilterVisibility - currentActivePage:', currentActivePage);
    console.log('🔧 applyTipoServicoFilterVisibility - shouldShowTipoServico:', shouldShowTipoServico);
    console.log('🔧 applyTipoServicoFilterVisibility - allData disponível:', !!(allData && allData.length > 0));
    console.log('🔧 applyTipoServicoFilterVisibility - fundosData disponível:', !!(fundosData && fundosData.length > 0));
    
    if (tipoServicoFilterContainer) {
        if (shouldShowTipoServico) {
            tipoServicoFilterContainer.style.display = 'block';
            tipoServicoFilterContainer.style.visibility = 'visible';
            console.log('🔧 ✅ TIPO SERVIÇO FORÇADO PARA VISÍVEL');
            
            // 🆕 POPULAR FILTRO DE TIPO DE SERVIÇO IMEDIATAMENTE
            setTimeout(() => {
                console.log('🔧 Populando filtro Tipo de Serviço DIRETAMENTE...');
                
                const tiposServico = new Set();
                
                // Buscar dados de ADESÕES
                if (allData && allData.length > 0) {
                    allData.forEach(d => {
                        if (d.tp_servico && d.tp_servico !== 'N/A' && d.tp_servico.trim() !== '') {
                            tiposServico.add(d.tp_servico.trim().toUpperCase());
                        }
                    });
                    console.log('🔧 Tipos de serviço encontrados em ADESÕES:', tiposServico.size);
                }
                
                // Buscar dados de FUNDOS
                if (fundosData && fundosData.length > 0) {
                    fundosData.forEach(d => {
                        if (d.tipo_servico && d.tipo_servico !== 'N/A' && d.tipo_servico.trim() !== '') {
                            tiposServico.add(d.tipo_servico.trim().toUpperCase());
                        }
                    });
                    console.log('🔧 Tipos de serviço encontrados em FUNDOS:', tiposServico.size);
                }
                
                if (tiposServico.size > 0) {
                    tipoServicoFilter.empty();
                    
                    const tiposServicoUnicos = [...tiposServico].sort();
                    console.log('🔧 Tipos de Serviço ÚNICOS encontrados:', tiposServicoUnicos);
                    
                    tiposServicoUnicos.forEach((t) => {
                        tipoServicoFilter.append($("<option>", { value: t, text: t }));
                        console.log('🔧 Adicionando opção Tipo Serviço:', t);
                    });
                } else {
                    console.log('🔧 ❌ Nenhum tipo de serviço encontrado');
                }
            }, 50);
            
            // 🆕 REINICIALIZAR MULTISELECT DO TIPO SERVIÇO QUANDO FICAR VISÍVEL
            setTimeout(() => {
                console.log('🔧 Reinicializando multiselect do TIPO SERVIÇO...');
                try {
                    // Destruir multiselect existente se houver
                    if (tipoServicoFilter.data('multiselect')) {
                        tipoServicoFilter.multiselect('destroy');
                    }
                    
                    // Recriar multiselect
                    tipoServicoFilter.multiselect({
                        includeSelectAllOption: true,
                        selectAllText: "Marcar todos",
                        allSelectedText: "Todos os tipos",
                        nonSelectedText: "Todos os tipos",
                        enableFiltering: false,
                        buttonWidth: '100%',
                        maxHeight: 300,
                        numberDisplayed: 2,
                        onChange: function(option, checked) {
                            console.log('🔧 Tipo Serviço filter changed:', option, 'checked:', checked);
                            // Só atualizar se estivermos na página 2
                            const currentPage = document.getElementById('btn-page2')?.classList.contains('active') ? 'page2' : 'other';
                            console.log('🔧 Página detectada no onChange:', currentPage);
                            if (currentPage === 'page2') {
                                console.log('🔧 ✅ Atualizando dashboard...');
                                updateDashboard();
                            } else {
                                console.log('🔧 ❌ Ignorando mudança de filtro - não estamos na página 2');
                            }
                        },
                        onSelectAll: function() {
                            console.log('🔧 Tipo Serviço - MARCAR TODOS acionado');
                            const currentPage = document.getElementById('btn-page2')?.classList.contains('active') ? 'page2' : 'other';
                            if (currentPage === 'page2') {
                                console.log('🔧 ✅ Atualizando dashboard (selectAll)...');
                                updateDashboard();
                            } else {
                                console.log('🔧 ❌ Ignorando selectAll - não estamos na página 2');
                            }
                        },
                        onDeselectAll: function() {
                            console.log('🔧 Tipo Serviço - DESMARCAR TODOS acionado');
                            const currentPage = document.getElementById('btn-page2')?.classList.contains('active') ? 'page2' : 'other';
                            if (currentPage === 'page2') {
                                console.log('🔧 ✅ Atualizando dashboard (deselectAll)...');
                                updateDashboard();
                            } else {
                                console.log('🔧 ❌ Ignorando deselectAll - não estamos na página 2');
                            }
                        }
                    });
                    console.log('🔧 ✅ Multiselect TIPO SERVIÇO reinicializado com sucesso');
                } catch (error) {
                    console.error('🔧 ❌ Erro ao reinicializar multiselect TIPO SERVIÇO:', error);
                }
            }, 100);
            
        } else {
            tipoServicoFilterContainer.style.display = 'none';
            tipoServicoFilterContainer.style.visibility = 'hidden';
            console.log('🔧 ✅ TIPO SERVIÇO FORÇADO PARA OCULTO');
        }
    } else {
        console.log('🔧 ❌ tipoServicoFilterContainer não encontrado');
    }
}

// 🆕 Função para controlar visibilidade do filtro Tipo de Cliente (só página 2)
function applyTipoClienteFilterVisibility() {
    const tipoClienteFilterContainer = document.getElementById('tipo-cliente-filter-container');
    
    if (tipoClienteFilterContainer) {
        const currentActivePage = document.getElementById('btn-page2')?.classList.contains('active') ? 'page2' : 'other';
        
        if (currentActivePage === 'page2') {
            tipoClienteFilterContainer.style.display = 'block';
            tipoClienteFilterContainer.style.visibility = 'visible';
            console.log('👥 ✅ TIPO CLIENTE mostrado para página 2');
            
            const tipoClienteFilter = $('#tipo-cliente-filter');
            
            // População similar ao tipo serviço
            setTimeout(() => {
                const tiposCliente = new Set();
                
                // Buscar dados de ADESÕES
                if (allData && allData.length > 0) {
                    allData.forEach(d => {
                        if (d.tipo_cliente && d.tipo_cliente !== 'N/A' && d.tipo_cliente.trim() !== '') {
                            tiposCliente.add(d.tipo_cliente.trim().toUpperCase());
                        }
                    });
                    console.log('👥 Tipos de cliente encontrados em ADESÕES:', tiposCliente.size);
                }
                
                // Buscar dados de FUNDOS
                if (fundosData && fundosData.length > 0) {
                    fundosData.forEach(d => {
                        if (d.tipo_cliente && d.tipo_cliente !== 'N/A' && d.tipo_cliente.trim() !== '') {
                            tiposCliente.add(d.tipo_cliente.trim().toUpperCase());
                        }
                    });
                    console.log('👥 Tipos de cliente encontrados em FUNDOS:', tiposCliente.size);
                }
                
                if (tiposCliente.size > 0) {
                    tipoClienteFilter.empty();
                    
                    const tiposClienteUnicos = [...tiposCliente].sort();
                    console.log('👥 Tipos de Cliente ÚNICOS encontrados:', tiposClienteUnicos);
                    
                    tiposClienteUnicos.forEach((t) => {
                        tipoClienteFilter.append($("<option>", { value: t, text: t }));
                        console.log('👥 Adicionando opção Tipo Cliente:', t);
                    });
                } else {
                    console.log('👥 ❌ Nenhum tipo de cliente encontrado');
                }
            }, 50);
            
            // Reinicializar multiselect
            setTimeout(() => {
                console.log('👥 Reinicializando multiselect do TIPO CLIENTE...');
                try {
                    if (tipoClienteFilter.data('multiselect')) {
                        tipoClienteFilter.multiselect('destroy');
                    }
                    
                    tipoClienteFilter.multiselect({
                        includeSelectAllOption: true,
                        selectAllText: "Marcar todos",
                        allSelectedText: "Todos os tipos",
                        nonSelectedText: "Todos os tipos",
                        enableFiltering: false,
                        buttonWidth: '100%',
                        maxHeight: 300,
                        numberDisplayed: 2,
                        onChange: function(option, checked) {
                            console.log('👥 Tipo Cliente filter changed:', option, 'checked:', checked);
                            const currentPage = document.getElementById('btn-page2')?.classList.contains('active') ? 'page2' : 'other';
                            console.log('👥 Página detectada no onChange:', currentPage);
                            if (currentPage === 'page2') {
                                console.log('👥 ✅ Atualizando dashboard...');
                                updateDashboard();
                            } else {
                                console.log('👥 ❌ Ignorando mudança de filtro - não estamos na página 2');
                            }
                        },
                        onSelectAll: function() {
                            console.log('👥 Tipo Cliente - MARCAR TODOS acionado');
                            const currentPage = document.getElementById('btn-page2')?.classList.contains('active') ? 'page2' : 'other';
                            if (currentPage === 'page2') {
                                console.log('👥 ✅ Atualizando dashboard (selectAll)...');
                                updateDashboard();
                            } else {
                                console.log('👥 ❌ Ignorando selectAll - não estamos na página 2');
                            }
                        },
                        onDeselectAll: function() {
                            console.log('👥 Tipo Cliente - DESMARCAR TODOS acionado');
                            const currentPage = document.getElementById('btn-page2')?.classList.contains('active') ? 'page2' : 'other';
                            if (currentPage === 'page2') {
                                console.log('👥 ✅ Atualizando dashboard (deselectAll)...');
                                updateDashboard();
                            } else {
                                console.log('👥 ❌ Ignorando deselectAll - não estamos na página 2');
                            }
                        }
                    });
                    console.log('👥 ✅ Multiselect TIPO CLIENTE reinicializado com sucesso');
                } catch (error) {
                    console.error('👥 ❌ Erro ao reinicializar multiselect TIPO CLIENTE:', error);
                }
            }, 100);
            
        } else {
            tipoClienteFilterContainer.style.display = 'none';
            tipoClienteFilterContainer.style.visibility = 'hidden';
            console.log('👥 ✅ TIPO CLIENTE FORÇADO PARA OCULTO');
        }
    } else {
        console.log('👥 ❌ tipoClienteFilterContainer não encontrado');
    }
}

// 🆕 Função para controlar visibilidade do filtro Instituição (só página 2)
function applyInstituicaoFilterVisibility() {
    // Determinar página ativa
    let currentActivePage = 'page1';
    if (document.getElementById('btn-page1')?.classList.contains('active')) {
        currentActivePage = 'page1';
    } else if (document.getElementById('btn-page2')?.classList.contains('active')) {
        currentActivePage = 'page2';
    } else if (document.getElementById('btn-page3')?.classList.contains('active')) {
        currentActivePage = 'page3';
    }
    
    const shouldShowInstituicao = (currentActivePage === 'page2');
    const instituicaoFilterContainer = document.getElementById('instituicao-filter-container');
    const instituicaoFilter = $("#instituicao-filter");
    
    console.log('🔧 applyInstituicaoFilterVisibility - currentActivePage:', currentActivePage);
    console.log('🔧 applyInstituicaoFilterVisibility - shouldShowInstituicao:', shouldShowInstituicao);
    console.log('🔧 applyInstituicaoFilterVisibility - allData disponível:', !!(allData && allData.length > 0));
    console.log('🔧 applyInstituicaoFilterVisibility - fundosData disponível:', !!(fundosData && fundosData.length > 0));
    
    if (instituicaoFilterContainer) {
        if (shouldShowInstituicao) {
            instituicaoFilterContainer.style.display = 'block';
            instituicaoFilterContainer.style.visibility = 'visible';
            console.log('🔧 ✅ INSTITUIÇÃO FORÇADO PARA VISÍVEL');
            
            // 🆕 POPULAR FILTRO DE INSTITUIÇÃO IMEDIATAMENTE
            setTimeout(() => {
                console.log('🔧 Populando filtro Instituição DIRETAMENTE...');
                
                const instituicoes = new Set();
                
                // Buscar dados de ADESÕES
                if (allData && allData.length > 0) {
                    allData.forEach(d => {
                        if (d.nm_instituicao && d.nm_instituicao !== 'N/A' && d.nm_instituicao.trim() !== '') {
                            instituicoes.add(d.nm_instituicao.trim().toUpperCase());
                        }
                    });
                    console.log('🔧 Instituições encontradas em ADESÕES:', instituicoes.size);
                }
                
                // Buscar dados de FUNDOS
                if (fundosData && fundosData.length > 0) {
                    fundosData.forEach(d => {
                        if (d.instituicao && d.instituicao !== 'N/A' && d.instituicao.trim() !== '') {
                            instituicoes.add(d.instituicao.trim().toUpperCase());
                        }
                    });
                    console.log('🔧 Instituições encontradas em FUNDOS:', instituicoes.size);
                }
                
                if (instituicoes.size > 0) {
                    instituicaoFilter.empty();
                    
                    const instituicoesUnicas = [...instituicoes].sort();
                    console.log('🔧 Instituições ÚNICAS encontradas:', instituicoesUnicas);
                    
                    instituicoesUnicas.forEach((t) => {
                        instituicaoFilter.append($("<option>", { value: t, text: t }));
                        console.log('🔧 Adicionando opção Instituição:', t);
                    });
                } else {
                    console.log('🔧 ❌ Nenhuma instituição encontrada');
                }
            }, 50);
            
            // 🆕 REINICIALIZAR MULTISELECT DA INSTITUIÇÃO QUANDO FICAR VISÍVEL
            setTimeout(() => {
                console.log('🔧 Reinicializando multiselect da INSTITUIÇÃO...');
                try {
                    // Destruir multiselect existente se houver
                    if (instituicaoFilter.data('multiselect')) {
                        instituicaoFilter.multiselect('destroy');
                    }
                    
                    // Recriar multiselect
                    instituicaoFilter.multiselect({
                        enableFiltering: true,
                        includeSelectAllOption: true,
                        selectAllText: "Marcar todos",
                        filterPlaceholder: "Pesquisar...",
                        allSelectedText: "Todas as instituições",
                        nonSelectedText: "Todas as instituições",
                        buttonWidth: '100%',
                        maxHeight: 300,
                        numberDisplayed: 2,
                        enableCaseInsensitiveFiltering: true,
                        filterBehavior: 'text',
                        onChange: function(option, checked) {
                            console.log('🔧 Instituição filter changed:', option, 'checked:', checked);
                            // Só atualizar se estivermos na página 2
                            const currentPage = document.getElementById('btn-page2')?.classList.contains('active') ? 'page2' : 'other';
                            console.log('🔧 Página detectada no onChange:', currentPage);
                            if (currentPage === 'page2') {
                                console.log('🔧 ✅ Atualizando dashboard...');
                                updateDashboard();
                            } else {
                                console.log('🔧 ❌ Ignorando mudança de filtro - não estamos na página 2');
                            }
                        },
                        onSelectAll: function() {
                            console.log('🔧 Instituição - MARCAR TODOS acionado');
                            const currentPage = document.getElementById('btn-page2')?.classList.contains('active') ? 'page2' : 'other';
                            if (currentPage === 'page2') {
                                console.log('🔧 ✅ Atualizando dashboard (selectAll)...');
                                updateDashboard();
                            } else {
                                console.log('🔧 ❌ Ignorando selectAll - não estamos na página 2');
                            }
                        },
                        onDeselectAll: function() {
                            console.log('🔧 Instituição - DESMARCAR TODOS acionado');
                            const currentPage = document.getElementById('btn-page2')?.classList.contains('active') ? 'page2' : 'other';
                            if (currentPage === 'page2') {
                                console.log('🔧 ✅ Atualizando dashboard (deselectAll)...');
                                updateDashboard();
                            } else {
                                console.log('🔧 ❌ Ignorando deselectAll - não estamos na página 2');
                            }
                        }
                    });
                    console.log('🔧 ✅ Multiselect INSTITUIÇÃO reinicializado com sucesso');
                } catch (error) {
                    console.error('🔧 ❌ Erro ao reinicializar multiselect INSTITUIÇÃO:', error);
                }
            }, 100);
            
        } else {
            instituicaoFilterContainer.style.display = 'none';
            instituicaoFilterContainer.style.visibility = 'hidden';
            console.log('🔧 ✅ INSTITUIÇÃO FORÇADO PARA OCULTO');
        }
    } else {
        console.log('🔧 ❌ instituicaoFilterContainer não encontrado');
    }
}

// Função para atualizar filtros dependentes quando as unidades mudam
function updateDependentFilters(selectedUnidades = []) {
    console.log('updateDependentFilters called with:', selectedUnidades);
    
    // ⚠️ VALIDAÇÃO CRÍTICA: Verificar se os dados estão carregados
    if (!allData || allData.length === 0) {
        console.warn('⚠️ allData ainda não carregado em updateDependentFilters - aguardando...');
        return;
    }
    
    if (!fundosData || fundosData.length === 0) {
        console.warn('⚠️ fundosData ainda não carregado em updateDependentFilters - aguardando...');
        return;
    }
    
    console.log('✅ Dados validados em updateDependentFilters - prosseguindo');
    
    const cursoFilter = $("#curso-filter");
    const consultorFilter = $("#consultor-filter");
    const origemLeadFilter = $("#origem-lead-filter");
    const segmentacaoLeadFilter = $("#segmentacao-lead-filter");
    const etiquetasFilter = $("#etiquetas-filter");
    const fundoFilter = $("#fundo-filter");
    
    // Verificar se estamos na página do funil
    const isFunilPage = document.getElementById('btn-page3')?.classList.contains('active') || 
                       document.getElementById('page3')?.classList.contains('active');
    
    // Verificar se estamos na página "Metas e Resultados" 
    const isMetasPage = document.getElementById('btn-page1')?.classList.contains('active') || 
                       document.getElementById('page1')?.classList.contains('active');
    
    // CORREÇÃO DEFINITIVA: Detecção mais robusta de página ativa
    let currentActivePage = null;
    
    // Verificar qual botão de navegação está ativo
    if (document.getElementById('btn-page1')?.classList.contains('active')) {
        currentActivePage = 'page1';
    } else if (document.getElementById('btn-page2')?.classList.contains('active')) {
        currentActivePage = 'page2';
    } else if (document.getElementById('btn-page3')?.classList.contains('active')) {
        currentActivePage = 'page3';
    }
    
    // Se nenhum botão estiver ativo, verificar pelo elemento da página
    if (!currentActivePage) {
        if (document.getElementById('page1')?.classList.contains('active')) {
            currentActivePage = 'page1';
        } else if (document.getElementById('page2')?.classList.contains('active')) {
            currentActivePage = 'page2';
        } else if (document.getElementById('page3')?.classList.contains('active')) {
            currentActivePage = 'page3';
        }
    }
    
    // Lógica simples: MOSTRAR FUNDOS apenas na página 2
    const shouldShowFundos = (currentActivePage === 'page2');
    const shouldHideFundos = !shouldShowFundos;
    
    console.log('🔍 Detecção de página (updateDependentFilters):');
    console.log('  - currentActivePage:', currentActivePage);
    console.log('  - shouldShowFundos:', shouldShowFundos);
    console.log('  - shouldHideFundos:', shouldHideFundos);
    
    // Ocultar/mostrar filtros baseado na página
    const fundoFilterContainer = document.getElementById('fundo-filter-container');
    const consultorFilterContainer = document.getElementById('consultor-filter-container');
    const origemLeadFilterContainer = document.getElementById('origem-lead-filter-container');
    const segmentacaoLeadFilterContainer = document.getElementById('segmentacao-lead-filter-container');
    const etiquetasFilterContainer = document.getElementById('etiquetas-filter-container');
    
    if (fundoFilterContainer) {
        console.log('🎯 CONTROLE FILTRO FUNDOS:');
        console.log('  - fundoFilterContainer encontrado:', !!fundoFilterContainer);
        console.log('  - currentActivePage:', currentActivePage);
        console.log('  - shouldShowFundos:', shouldShowFundos);
        console.log('  - shouldHideFundos:', shouldHideFundos);
        
        if (shouldHideFundos) {
            fundoFilterContainer.style.display = 'none';
            fundoFilterContainer.style.visibility = 'hidden';
            console.log('  - ✅ FUNDOS OCULTADO FORÇADAMENTE');
        } else {
            fundoFilterContainer.style.display = 'block';
            fundoFilterContainer.style.visibility = 'visible';
            console.log('  - ✅ FUNDOS EXIBIDO FORÇADAMENTE');
            
            // 🆕 REINICIALIZAR MULTISELECT DO FUNDOS quando ficar visível
            setTimeout(() => {
                console.log('  - 🔧 Reinicializando multiselect FUNDOS (updateDependentFilters)...');
                try {
                    if (fundoFilter.data('multiselect')) {
                        fundoFilter.multiselect('destroy');
                    }
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
                        filterBehavior: 'text'
                    });
                    console.log('  - ✅ Multiselect FUNDOS reinicializado (updateDependentFilters)');
                } catch (error) {
                    console.error('  - ❌ Erro ao reinicializar multiselect FUNDOS:', error);
                }
            }, 50);
        }
    } else {
        console.log('❌ fundoFilterContainer NÃO ENCONTRADO!');
    }
    
    if (consultorFilterContainer) {
        if (isFunilPage) {
            consultorFilterContainer.style.display = 'block';
        } else {
            consultorFilterContainer.style.display = 'none';
        }
    }

    if (origemLeadFilterContainer) {
        if (isFunilPage) {
            origemLeadFilterContainer.style.display = 'block';
        } else {
            origemLeadFilterContainer.style.display = 'none';
        }
    }

    if (segmentacaoLeadFilterContainer) {
        if (isFunilPage) {
            segmentacaoLeadFilterContainer.style.display = 'block';
        } else {
            segmentacaoLeadFilterContainer.style.display = 'none';
        }
    }

    if (etiquetasFilterContainer) {
        if (isFunilPage) {
            etiquetasFilterContainer.style.display = 'block';
        } else {
            etiquetasFilterContainer.style.display = 'none';
        }
    }
    
    // Destruir instâncias existentes
    try {
        cursoFilter.multiselect('destroy');
        if (isFunilPage) {
            consultorFilter.multiselect('destroy');
            origemLeadFilter.multiselect('destroy');
            segmentacaoLeadFilter.multiselect('destroy');
            etiquetasFilter.multiselect('destroy');
        } else {
            fundoFilter.multiselect('destroy');
        }
    } catch(e) {
        console.log("Multiselect de filtros dependentes não existia ainda");
    }
    
    // Limpar opções
    cursoFilter.empty();
    if (isFunilPage) {
        consultorFilter.empty();
        origemLeadFilter.empty();
        segmentacaoLeadFilter.empty();
        etiquetasFilter.empty();
    } else {
        fundoFilter.empty();
    }
    
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
    const funilFiltrado = funilData.filter(d => unidadesFiltradas.includes(d.nm_unidade));
    
    // Popular filtro de cursos
    let cursos = [];
    if (isFunilPage) {
        // Para página do funil, usar coluna D do funil (Qual é o seu curso?)
        const cursosFunil = funilFiltrado.map((d) => d.curso || '').filter(c => c && c.trim() !== '' && c !== 'N/A');
        cursos = [...new Set(cursosFunil)].sort();
        console.log('Cursos do funil:', cursos);
    } else {
        // Para outras páginas, usar dados de vendas e fundos
        const cursosVendas = dadosFiltrados.map((d) => d.curso_fundo || '').filter(c => c && c !== 'N/A');
        const cursosFundos = fundosFiltrados.map((d) => d.curso_fundo || '').filter(c => c && c !== 'N/A');
        cursos = [...new Set([...cursosVendas, ...cursosFundos])].sort();
    }
    
    cursos.forEach((c) => {
        cursoFilter.append($("<option>", { value: c, text: c }));
    });
    
    // Popular filtro de consultores (apenas se for página do funil)
    if (isFunilPage) {
        const consultoresFunil = funilFiltrado.map((d) => d.consultor || '').filter(c => c && c.trim() !== '' && c !== 'N/A');
        const consultores = [...new Set(consultoresFunil)].sort();
        console.log('Consultores do funil:', consultores);
        
        consultores.forEach((c) => {
            consultorFilter.append($("<option>", { value: c, text: c }));
        });

        // Popular filtro de origem do lead (apenas se for página do funil)
        const origemLeadFunil = funilFiltrado.map((d) => d.origem_lead || '').filter(o => o && o.trim() !== '' && o !== 'N/A');
        const origensLead = [...new Set(origemLeadFunil)].sort();
        console.log('Origens do lead do funil:', origensLead);
        
        origensLead.forEach((o) => {
            origemLeadFilter.append($("<option>", { value: o, text: o }));
        });

        // Popular filtro de segmentação lead (apenas se for página do funil)
        const segmentacaoLeadFunil = funilFiltrado.map((d) => d.segmentacao_lead || '').filter(s => s && s.trim() !== '' && s !== 'N/A');
        const segmentacoesLead = [...new Set(segmentacaoLeadFunil)].sort();
        console.log('Segmentações do lead do funil:', segmentacoesLead);
        
        segmentacoesLead.forEach((s) => {
            segmentacaoLeadFilter.append($("<option>", { value: s, text: s }));
        });

        // Popular filtro de etiquetas (apenas se for página do funil)
        const etiquetasFunil = funilFiltrado.map((d) => d.etiquetas || '').filter(e => e && e.trim() !== '' && e !== 'N/A');
        const etiquetas = [...new Set(etiquetasFunil)].sort();
        console.log('Etiquetas do funil:', etiquetas);
        
        etiquetas.forEach((e) => {
            etiquetasFilter.append($("<option>", { value: e, text: e }));
        });
    }
    
    // Popular filtro de fundos (apenas se não deve ocultar FUNDOS)
    if (!shouldHideFundos) {
        console.log('🔧 🎯 POPULANDO FILTRO DE FUNDOS...');
        console.log('  - dadosFiltrados length:', dadosFiltrados.length);
        console.log('  - fundosFiltrados length:', fundosFiltrados.length);
        
        const fundosFromVendas = dadosFiltrados.map((d) => d.nm_fundo || '').filter(f => f && f !== 'N/A');
        const fundosFromFundos = fundosFiltrados.map((d) => d.nm_fundo || '').filter(f => f && f !== 'N/A');
        
        console.log('  - fundosFromVendas length:', fundosFromVendas.length);
        console.log('  - fundosFromVendas examples:', fundosFromVendas.slice(0, 5));
        console.log('  - fundosFromFundos length:', fundosFromFundos.length);
        console.log('  - fundosFromFundos examples:', fundosFromFundos.slice(0, 5));
        
        const fundosUnicos = [...new Set([...fundosFromVendas, ...fundosFromFundos])].sort();
        console.log('  - fundosUnicos length:', fundosUnicos.length);
        console.log('  - fundosUnicos:', fundosUnicos);
        
        fundosUnicos.forEach((f) => {
            fundoFilter.append($("<option>", { value: f, text: f }));
        });
        
        console.log('🔧 ✅ Filtro de fundos populado com', fundosUnicos.length, 'opções');
    } else {
        console.log('🔧 ❌ Filtro de fundos OCULTO (shouldHideFundos = true)');
    }
    
    // 🆕 Popular filtro de tipo de adesão (apenas para página 2)
    const shouldShowTipoAdesao = (currentActivePage === 'page2');
    const tipoAdesaoFilter = $("#tipo-adesao-filter");
    
    if (shouldShowTipoAdesao) {
        console.log('🔧 Populando filtro Tipo de Adesão...');
        console.log('🔧 dadosFiltrados length:', dadosFiltrados.length);
        console.log('🔧 Amostra de dadosFiltrados (primeiros 3):', dadosFiltrados.slice(0, 3));
        
        tipoAdesaoFilter.empty();
        
        // 🆕 Debug: Verificar se venda_posvenda existe nos dados
        const amostraVendaPosvenda = dadosFiltrados.slice(0, 10).map(d => ({
            unidade: d.nm_unidade,
            venda_posvenda: d.venda_posvenda,
            valor: d.vl_plano
        }));
        console.log('🔧 Amostra venda_posvenda:', amostraVendaPosvenda);
        
        // 🆕 CORREÇÃO: Usar TODOS os dados de vendas, não apenas filtrados por unidade
        // para que o filtro mostre todas as opções disponíveis
        const dadosParaTipoAdesao = allData; // Em vez de dadosFiltrados
        console.log('🔧 Usando allData para tipos de adesão. Total:', dadosParaTipoAdesao.length);
        
        const tiposAdesao = dadosParaTipoAdesao
            .map((d) => d.venda_posvenda || '')
            .filter(t => t && t !== 'N/A' && t.trim() !== '')
            .map(t => t.trim().toUpperCase()); // Normalizar para maiúsculo
        
        console.log('🔧 Tipos de adesão BRUTOS (antes do Set):', tiposAdesao.slice(0, 20));
        
        const tiposAdesaoUnicos = [...new Set(tiposAdesao)].sort();
        
        console.log('🔧 Tipos de adesão encontrados (únicos):', tiposAdesaoUnicos);
        console.log('🔧 Quantidade total de registros processados:', dadosFiltrados.length);
        console.log('🔧 Quantidade de tipos válidos:', tiposAdesao.length);
        
        tiposAdesaoUnicos.forEach((t) => {
            tipoAdesaoFilter.append($("<option>", { value: t, text: t }));
        });
    }
    
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
    
    // Recriar multiselects para consultores (apenas se for página do funil)
    if (isFunilPage) {
        consultorFilter.multiselect({
            enableFiltering: true,
            includeSelectAllOption: true,
            selectAllText: "Marcar todos",
            filterPlaceholder: "Pesquisar...",
            nonSelectedText: "Todos os consultores",
            nSelectedText: "consultores",
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

        // Recriar multiselects para origem do lead (apenas se for página do funil)
        origemLeadFilter.multiselect({
            enableFiltering: true,
            includeSelectAllOption: true,
            selectAllText: "Marcar todos",
            filterPlaceholder: "Pesquisar...",
            nonSelectedText: "Todas as origens",
            nSelectedText: "origens",
            allSelectedText: "Todas selecionadas",
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

        // Recriar multiselects para segmentação lead (apenas se for página do funil)
        segmentacaoLeadFilter.multiselect({
            enableFiltering: true,
            includeSelectAllOption: true,
            selectAllText: "Marcar todos",
            filterPlaceholder: "Pesquisar...",
            nonSelectedText: "Todas as segmentações",
            nSelectedText: "segmentações",
            allSelectedText: "Todas selecionadas",
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

        // Recriar multiselects para etiquetas (apenas se for página do funil)
        etiquetasFilter.multiselect({
            enableFiltering: true,
            includeSelectAllOption: true,
            selectAllText: "Marcar todos",
            filterPlaceholder: "Pesquisar...",
            nonSelectedText: "Todas as etiquetas",
            nSelectedText: "etiquetas",
            allSelectedText: "Todas selecionadas",
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
    
    // Recriar multiselects para fundos (apenas se não deve ocultar FUNDOS)
    if (!shouldHideFundos) {
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
    
    // 🆕 Recriar multiselect para tipo de adesão (apenas se for página 2)
    if (shouldShowTipoAdesao) {
        console.log('🔧 Inicializando multiselect Tipo de Adesão...');
        tipoAdesaoFilter.multiselect({
            includeSelectAllOption: true,
            selectAllText: "Marcar todos",
            allSelectedText: "Todos os tipos",
            nonSelectedText: "Todos os tipos",
            nSelectedText: "tipos",
            buttonWidth: "100%",
            maxHeight: 300,
            onChange: function() {
                console.log('🔧 Tipo Adesão filter changed, updating dashboard...');
                updateDashboard();
            },
            onSelectAll: updateDashboard,
            onDeselectAll: updateDashboard,
            enableFiltering: false,
            dropUp: false,
            dropRight: false,
            templates: {
                button: '<button type="button" class="multiselect dropdown-toggle" data-toggle="dropdown"><span class="multiselect-selected-text"></span></button>',
                ul: '<ul class="multiselect-container dropdown-menu" style="width: auto; min-width: 100%;"></ul>'
            }
        });
        console.log('🔧 ✅ Multiselect Tipo de Adesão inicializado');
    }
}

// Arquivo: script.js (do Dashboard de Vendas)

// ...

// Função auxiliar para retentar população de filtros
function retryPopulateFilters(selectedUnidades = [], maxRetries = 5, currentRetry = 0) {
    console.log(`🔄 Tentativa ${currentRetry + 1} de ${maxRetries} para popular filtros`);
    
    // Verificar se os dados estão carregados
    const dataReady = allData && allData.length > 0 && fundosData && fundosData.length > 0;
    
    if (dataReady) {
        console.log('✅ Dados prontos - populando filtros...');
        populateFilters(selectedUnidades);
        return;
    }
    
    if (currentRetry < maxRetries - 1) {
        console.log(`⏳ Dados ainda não prontos - tentando novamente em 500ms...`);
        setTimeout(() => {
            retryPopulateFilters(selectedUnidades, maxRetries, currentRetry + 1);
        }, 500);
    } else {
        console.error('❌ Falha ao carregar dados após', maxRetries, 'tentativas');
    }
}

// Função auxiliar para retentar updateDependentFilters
function retryUpdateDependentFilters(selectedUnidades = [], maxRetries = 5, currentRetry = 0) {
    console.log(`🔄 Tentativa ${currentRetry + 1} de ${maxRetries} para updateDependentFilters`);
    
    // Verificar se os dados estão carregados
    const dataReady = allData && allData.length > 0 && fundosData && fundosData.length > 0;
    
    if (dataReady) {
        console.log('✅ Dados prontos - atualizando filtros dependentes...');
        updateDependentFilters(selectedUnidades);
        return;
    }
    
    if (currentRetry < maxRetries - 1) {
        console.log(`⏳ Dados ainda não prontos - tentando novamente em 500ms...`);
        setTimeout(() => {
            retryUpdateDependentFilters(selectedUnidades, maxRetries, currentRetry + 1);
        }, 500);
    } else {
        console.error('❌ Falha ao carregar dados para updateDependentFilters após', maxRetries, 'tentativas');
    }
}

function populateFilters(selectedUnidades = []) {
    console.log('populateFilters called with:', selectedUnidades);
    console.log('userAccessLevel:', userAccessLevel);
    console.log('allData length:', allData ? allData.length : 0);
    console.log('fundosData length:', fundosData ? fundosData.length : 0);
    console.log('funilData length:', funilData ? funilData.length : 0);
    
    // ⚠️ VALIDAÇÃO CRÍTICA: Verificar se os dados estão carregados
    if (!allData || allData.length === 0) {
        console.warn('⚠️ allData ainda não carregado - aguardando...');
        return;
    }
    
    if (!fundosData || fundosData.length === 0) {
        console.warn('⚠️ fundosData ainda não carregado - aguardando...');
        return;
    }
    
    console.log('✅ Dados validados - prosseguindo com populateFilters');
    
    const unidadeFilter = $("#unidade-filter");
    const cursoFilter = $("#curso-filter");
    const consultorFilter = $("#consultor-filter");
    const origemLeadFilter = $("#origem-lead-filter");
    const segmentacaoLeadFilter = $("#segmentacao-lead-filter");
    const etiquetasFilter = $("#etiquetas-filter");
    const fundoFilter = $("#fundo-filter");
    
    // Verificar se estamos na página do funil
    const isFunilPage = document.getElementById('btn-page3')?.classList.contains('active') || 
                       document.getElementById('page3')?.classList.contains('active');
    
    // Verificar se estamos na página "Metas e Resultados" 
    const isMetasPage = document.getElementById('btn-page1')?.classList.contains('active') || 
                       document.getElementById('page1')?.classList.contains('active');
    
    // CORREÇÃO DEFINITIVA: Detecção mais robusta de página ativa
    let currentActivePage = null;
    
    // Verificar qual botão de navegação está ativo
    if (document.getElementById('btn-page1')?.classList.contains('active')) {
        currentActivePage = 'page1';
    } else if (document.getElementById('btn-page2')?.classList.contains('active')) {
        currentActivePage = 'page2';
    } else if (document.getElementById('btn-page3')?.classList.contains('active')) {
        currentActivePage = 'page3';
    }
    
    // Se nenhum botão estiver ativo, verificar pelo elemento da página
    if (!currentActivePage) {
        if (document.getElementById('page1')?.classList.contains('active')) {
            currentActivePage = 'page1';
        } else if (document.getElementById('page2')?.classList.contains('active')) {
            currentActivePage = 'page2';
        } else if (document.getElementById('page3')?.classList.contains('active')) {
            currentActivePage = 'page3';
        }
    }
    
    // Lógica de exibição dos filtros por página
    const shouldShowFundos = true; // ✅ FUNDOS deve aparecer em TODAS as páginas
    const shouldHideFundos = false; // ✅ NUNCA ocultar fundos
    
    console.log('🔍 Detecção de página (populateFilters):');
    console.log('  - currentActivePage:', currentActivePage);
    console.log('  - shouldShowFundos:', shouldShowFundos, '(sempre true)');
    console.log('  - shouldHideFundos:', shouldHideFundos, '(sempre false)');
    
    // Ocultar/mostrar filtros baseado na página
    const fundoFilterContainer = document.getElementById('fundo-filter-container');
    const consultorFilterContainer = document.getElementById('consultor-filter-container');
    const origemLeadFilterContainer = document.getElementById('origem-lead-filter-container');
    
    if (fundoFilterContainer) {
        console.log('🎯 CONTROLE FILTRO FUNDOS (populateFilters):');
        console.log('  - fundoFilterContainer encontrado:', !!fundoFilterContainer);
        console.log('  - currentActivePage:', currentActivePage);
        console.log('  - shouldShowFundos:', shouldShowFundos);
        console.log('  - shouldHideFundos:', shouldHideFundos);
        
        if (shouldHideFundos) {
            fundoFilterContainer.style.display = 'none';
            fundoFilterContainer.style.visibility = 'hidden';
            console.log('  - ✅ FUNDOS OCULTADO FORÇADAMENTE (populateFilters)');
        } else {
            fundoFilterContainer.style.display = 'block';
            fundoFilterContainer.style.visibility = 'visible';
            console.log('  - ✅ FUNDOS EXIBIDO FORÇADAMENTE (populateFilters)');
            
            // 🆕 REINICIALIZAR MULTISELECT DO FUNDOS quando ficar visível
            setTimeout(() => {
                console.log('  - 🔧 Reinicializando multiselect FUNDOS (populateFilters)...');
                try {
                    if (fundoFilter.data('multiselect')) {
                        fundoFilter.multiselect('destroy');
                    }
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
                        filterBehavior: 'text'
                    });
                    console.log('  - ✅ Multiselect FUNDOS reinicializado (populateFilters)');
                } catch (error) {
                    console.error('  - ❌ Erro ao reinicializar multiselect FUNDOS:', error);
                }
            }, 50);
        }
    } else {
        console.log('❌ fundoFilterContainer NÃO ENCONTRADO! (populateFilters)');
    }
    
    if (consultorFilterContainer) {
        if (isFunilPage) {
            consultorFilterContainer.style.display = 'block';
        } else {
            consultorFilterContainer.style.display = 'none';
        }
    }

    if (origemLeadFilterContainer) {
        if (isFunilPage) {
            origemLeadFilterContainer.style.display = 'block';
        } else {
            origemLeadFilterContainer.style.display = 'none';
        }
    }

    const segmentacaoLeadFilterContainer = document.getElementById('segmentacao-lead-filter-container');
    if (segmentacaoLeadFilterContainer) {
        if (isFunilPage) {
            segmentacaoLeadFilterContainer.style.display = 'block';
        } else {
            segmentacaoLeadFilterContainer.style.display = 'none';
        }
    }

    const etiquetasFilterContainer = document.getElementById('etiquetas-filter-container');
    if (etiquetasFilterContainer) {
        if (isFunilPage) {
            etiquetasFilterContainer.style.display = 'block';
        } else {
            etiquetasFilterContainer.style.display = 'none';
        }
    }
    
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
    if (!shouldHideFundos) {
        fundoFilter.empty();
    }
    
    console.log('🧹 Filtros limpos. Curso filter options:', cursoFilter.children().length);
    console.log('🧹 Fundo filter options:', fundoFilter.children().length);

    if (userAccessLevel === "ALL_UNITS") {
        // Salva as seleções atuais antes de qualquer modificação
        const currentSelectedValues = unidadeFilter.val() || [];
        
        // Sempre destroi e reconstrói para evitar problemas
        try {
            if (unidadeFilter.data('multiselect')) {
                unidadeFilter.multiselect('destroy');
            }
        } catch (e) {
            console.log('Erro ao destruir multiselect:', e);
        }
        
        // Limpa e reconstrói as opções
        unidadeFilter.empty();
        
        // Verifica se estamos na página do funil para incluir "Sem unidade"
        const isFunilPage = document.getElementById('btn-page3')?.classList.contains('active') || 
                           document.getElementById('page3')?.classList.contains('active');
        
        const unidadesVendas = allData.map((d) => d.nm_unidade);
        const unidadesFundos = fundosData.map((d) => d.nm_unidade);
        const unidadesFunil = funilData ? funilData.map((d) => d.nm_unidade).filter(Boolean) : [];
        
        // 🆕 CORREÇÃO: Incluir unidades que só existem nas metas
        const unidadesMetas = Array.from(metasData.keys()).map(key => key.split("-")[0]);
        console.log('🎯 Unidades das metas:', unidadesMetas.length);
        
        // Combina TODAS as unidades: vendas, fundos, funil E metas
        const unidades = [...new Set([...unidadesVendas, ...unidadesFundos, ...unidadesFunil, ...unidadesMetas])].sort();
        
        if (isFunilPage && funilData && funilData.some(item => item.nm_unidade === 'Sem unidade') && !unidades.includes('Sem unidade')) {
            unidades.push('Sem unidade');
            unidades.sort();
        }
        
        console.log('🏢 Criando filtro com unidades:', unidades.length);
        
        unidades.forEach((u) => {
            const isSelected = currentSelectedValues.includes(u);
            unidadeFilter.append($("<option>", { 
                value: u, 
                text: u,
                selected: isSelected 
            }));
        });

        // Filtra os dados com base nas unidades selecionadas
        const unidadesFiltradas = selectedUnidades.length > 0 ? selectedUnidades : [
            ...new Set([
                ...allData.map(d => d.nm_unidade),
                ...fundosData.map(d => d.nm_unidade),
                ...(funilData ? funilData.map(d => d.nm_unidade).filter(Boolean) : [])
            ])
        ];
        
        const dadosFiltrados = allData.filter(d => unidadesFiltradas.includes(d.nm_unidade));
        const fundosFiltrados = fundosData.filter(d => unidadesFiltradas.includes(d.nm_unidade));
        
        console.log('🔍 DADOS BÁSICOS:');
        console.log('allData total:', allData.length);
        console.log('fundosData total:', fundosData.length);
        console.log('funilData total:', funilData ? funilData.length : 0);
        console.log('dadosFiltrados:', dadosFiltrados.length);
        console.log('fundosFiltrados:', fundosFiltrados.length);
        
        // Só filtrar dados do funil se estivermos na página do funil E se houver dados do funil
        let funilFiltrado = [];
        if (isFunilPage && funilData && funilData.length > 0) {
            funilFiltrado = funilData.filter(d => unidadesFiltradas.includes(d.nm_unidade));
            console.log('funilFiltrado:', funilFiltrado.length);
        }

        // Populate cursos filter baseado na página atual
        let cursos = [];
        if (isFunilPage) {
            // Para página do funil, usar coluna D do funil (Qual é o seu curso?)
            console.log('🎯 USANDO DADOS DO FUNIL para cursos');
            console.log('funilFiltrado length:', funilFiltrado.length);
            if (funilFiltrado.length > 0) {
                console.log('Amostra funilFiltrado:', funilFiltrado.slice(0, 3).map(d => ({
                    titulo: d.titulo,
                    curso: d.curso,
                    nm_unidade: d.nm_unidade
                })));
                
                // Debug específico da coluna curso
                console.log('🔍 VERIFICANDO COLUNA CURSO:');
                console.log('Primeiros 10 valores da coluna curso:');
                funilFiltrado.slice(0, 10).forEach((item, index) => {
                    console.log(`  ${index + 1}. curso: "${item.curso}" | título: "${item.titulo}"`);
                });
                
                // Contar quantos têm curso preenchido vs vazio
                const comCurso = funilFiltrado.filter(d => d.curso && d.curso.trim() !== '' && d.curso !== 'N/A');
                const semCurso = funilFiltrado.filter(d => !d.curso || d.curso.trim() === '' || d.curso === 'N/A');
                console.log(`📊 Com curso: ${comCurso.length} | Sem curso: ${semCurso.length}`);
                
                if (comCurso.length > 0) {
                    console.log('Exemplos COM curso:', comCurso.slice(0, 5).map(d => d.curso));
                }
            }
            const cursosFunil = funilFiltrado.map((d) => d.curso || '').filter(c => c && c.trim() !== '' && c !== 'N/A');
            console.log('cursosFunil brutos:', cursosFunil.slice(0, 10));
            cursos = [...new Set(cursosFunil)].sort();
            console.log('Cursos do funil (populateFilters):', cursos);
        } else {
            // Para outras páginas, usar dados de vendas e fundos
            console.log('🎯 USANDO DADOS DE VENDAS/FUNDOS para cursos');
            console.log('dadosFiltrados length:', dadosFiltrados.length);
            console.log('fundosFiltrados length:', fundosFiltrados.length);
            const cursosVendas = dadosFiltrados.map((d) => d.curso_fundo || '').filter(c => c && c !== 'N/A');
            const cursosFundos = fundosFiltrados.map((d) => d.curso_fundo || '').filter(c => c && c !== 'N/A');
            console.log('cursosVendas length:', cursosVendas.length);
            console.log('cursosFundos length:', cursosFundos.length);
            cursos = [...new Set([...cursosVendas, ...cursosFundos])].sort();
            console.log('Cursos de vendas/fundos:', cursos.length, 'únicos');
        }
        
        cursos.forEach((c) => {
            cursoFilter.append($("<option>", { value: c, text: c }));
        });
        
        console.log('📝 Opções adicionadas ao filtro de curso:', cursos.length);
        console.log('📝 Curso filter agora tem:', cursoFilter.children().length, 'opções');
        console.log('📝 Primeiras 5 opções:', cursos.slice(0, 5));

        // Populate consultores filter (apenas se for página do funil)
        if (isFunilPage && funilFiltrado.length > 0) {
            console.log('🎯 POPULANDO CONSULTORES DO FUNIL');
            const consultoresFunil = funilFiltrado.map((d) => d.consultor || '').filter(c => c && c.trim() !== '' && c !== 'N/A');
            const consultores = [...new Set(consultoresFunil)].sort();
            console.log('Consultores do funil (populateFilters):', consultores);
            
            consultores.forEach((c) => {
                consultorFilter.append($("<option>", { value: c, text: c }));
            });
            
            console.log('📝 Opções adicionadas ao filtro de consultor:', consultores.length);
        }

        // Populate origem do lead filter (apenas se for página do funil)
        if (isFunilPage && funilFiltrado.length > 0) {
            console.log('🎯 POPULANDO ORIGEM DO LEAD DO FUNIL');
            const origemLeadFunil = funilFiltrado.map((d) => d.origem_lead || '').filter(o => o && o.trim() !== '' && o !== 'N/A');
            const origensLead = [...new Set(origemLeadFunil)].sort();
            console.log('Origens do lead do funil (populateFilters):', origensLead);
            
            origensLead.forEach((o) => {
                origemLeadFilter.append($("<option>", { value: o, text: o }));
            });
            
            console.log('📝 Opções adicionadas ao filtro de origem do lead:', origensLead.length);

            // Populate segmentacao lead filter (apenas se for página do funil)
            console.log('🎯 POPULANDO SEGMENTAÇÃO LEAD DO FUNIL');
            const segmentacaoLeadFunil = funilFiltrado.map((d) => d.segmentacao_lead || '').filter(s => s && s.trim() !== '' && s !== 'N/A');
            const segmentacoesLead = [...new Set(segmentacaoLeadFunil)].sort();
            console.log('Segmentações do lead do funil (populateFilters):', segmentacoesLead);
            
            segmentacoesLead.forEach((s) => {
                segmentacaoLeadFilter.append($("<option>", { value: s, text: s }));
            });
            
            console.log('📝 Opções adicionadas ao filtro de segmentação lead:', segmentacoesLead.length);

            // Populate etiquetas filter (apenas se for página do funil)
            console.log('🎯 POPULANDO ETIQUETAS DO FUNIL');
            const etiquetasFunil = funilFiltrado.map((d) => d.etiquetas || '').filter(e => e && e.trim() !== '' && e !== 'N/A');
            const etiquetas = [...new Set(etiquetasFunil)].sort();
            console.log('Etiquetas do funil (populateFilters):', etiquetas);
            
            etiquetas.forEach((e) => {
                etiquetasFilter.append($("<option>", { value: e, text: e }));
            });
            
            console.log('📝 Opções adicionadas ao filtro de etiquetas:', etiquetas.length);
        }

        // Populate fundos filter (apenas se não deve ocultar FUNDOS)
        if (!shouldHideFundos) {
            const fundosFromVendas = dadosFiltrados.map((d) => d.nm_fundo || '').filter(f => f && f !== 'N/A');
            const fundosFromFundos = fundosFiltrados.map((d) => d.nm_fundo || '').filter(f => f && f !== 'N/A');
            const fundosUnicos = [...new Set([...fundosFromVendas, ...fundosFromFundos])].sort();
            
            fundosUnicos.forEach((f) => {
                fundoFilter.append($("<option>", { value: f, text: f }));
            });
        }

        // Sempre inicializa os multiselects
        setTimeout(() => {
            console.log('Inicializando todos os multiselects...');
            
            // UNIDADES
            try {
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
                
                if (currentSelectedValues.length > 0) {
                    unidadeFilter.multiselect('select', currentSelectedValues);
                }
                
                console.log('Multiselect de unidades inicializado com sucesso');
            } catch (error) {
                console.error('Erro ao inicializar multiselect de unidades:', error);
            }

            // CURSOS
            try {
                // Destruir multiselect existente de curso
                try {
                    if (cursoFilter.data('multiselect')) {
                        cursoFilter.multiselect('destroy');
                        console.log('🔄 Multiselect de curso destruído');
                    }
                } catch (e) {
                    console.log('🔄 Nenhum multiselect de curso para destruir');
                }
                
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
                
                console.log('Multiselect de cursos inicializado com sucesso');
            } catch (error) {
                console.error('Erro ao inicializar multiselect de cursos:', error);
            }

            // CONSULTORES (apenas se for página do funil)
            if (isFunilPage) {
                try {
                    // Destruir multiselect existente de consultor
                    try {
                        if (consultorFilter.data('multiselect')) {
                            consultorFilter.multiselect('destroy');
                            console.log('🔄 Multiselect de consultor destruído');
                        }
                    } catch (e) {
                        console.log('🔄 Nenhum multiselect de consultor para destruir');
                    }
                    
                    consultorFilter.multiselect({
                        enableFiltering: true,
                        includeSelectAllOption: true,
                        selectAllText: "Marcar todos",
                        filterPlaceholder: "Pesquisar...",
                        nonSelectedText: "Todos os consultores",
                        nSelectedText: "consultores",
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
                    
                    console.log('Multiselect de consultores inicializado com sucesso');
                } catch (error) {
                    console.error('Erro ao inicializar multiselect de consultores:', error);
                }

                // ORIGEM DO LEAD (apenas se for página do funil)
                try {
                    // Destruir multiselect existente de origem do lead
                    try {
                        if (origemLeadFilter.data('multiselect')) {
                            origemLeadFilter.multiselect('destroy');
                            console.log('🔄 Multiselect de origem do lead destruído');
                        }
                    } catch (e) {
                        console.log('🔄 Nenhum multiselect de origem do lead para destruir');
                    }
                    
                    origemLeadFilter.multiselect({
                        enableFiltering: true,
                        includeSelectAllOption: true,
                        selectAllText: "Marcar todos",
                        filterPlaceholder: "Pesquisar...",
                        nonSelectedText: "Todas as origens",
                        nSelectedText: "origens",
                        allSelectedText: "Todas selecionadas",
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
                    
                    console.log('Multiselect de origem do lead inicializado com sucesso');
                } catch (error) {
                    console.error('Erro ao inicializar multiselect de origem do lead:', error);
                }

                // SEGMENTAÇÃO LEAD (apenas se for página do funil)
                try {
                    // Destruir multiselect existente de segmentação lead
                    try {
                        if (segmentacaoLeadFilter.data('multiselect')) {
                            segmentacaoLeadFilter.multiselect('destroy');
                            console.log('🔄 Multiselect de segmentação lead destruído');
                        }
                    } catch (e) {
                        console.log('🔄 Nenhum multiselect de segmentação lead para destruir');
                    }
                    
                    segmentacaoLeadFilter.multiselect({
                        enableFiltering: true,
                        includeSelectAllOption: true,
                        selectAllText: "Marcar todos",
                        filterPlaceholder: "Pesquisar...",
                        nonSelectedText: "Todas as segmentações",
                        nSelectedText: "segmentações",
                        allSelectedText: "Todas selecionadas",
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
                    
                    console.log('Multiselect de segmentação lead inicializado com sucesso');
                } catch (error) {
                    console.error('Erro ao inicializar multiselect de segmentação lead:', error);
                }

                // ETIQUETAS (apenas se for página do funil)
                try {
                    // Destruir multiselect existente de etiquetas
                    try {
                        if (etiquetasFilter.data('multiselect')) {
                            etiquetasFilter.multiselect('destroy');
                            console.log('🔄 Multiselect de etiquetas destruído');
                        }
                    } catch (e) {
                        console.log('🔄 Nenhum multiselect de etiquetas para destruir');
                    }
                    
                    etiquetasFilter.multiselect({
                        enableFiltering: true,
                        includeSelectAllOption: true,
                        selectAllText: "Marcar todos",
                        filterPlaceholder: "Pesquisar...",
                        nonSelectedText: "Todas as etiquetas",
                        nSelectedText: "etiquetas",
                        allSelectedText: "Todas selecionadas",
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
                    
                    console.log('Multiselect de etiquetas inicializado com sucesso');
                } catch (error) {
                    console.error('Erro ao inicializar multiselect de etiquetas:', error);
                }
            }

            // FUNDOS (apenas se não deve ocultar FUNDOS)
            if (!shouldHideFundos) {
                try {
                    // Destruir multiselect existente de fundos
                    try {
                        if (fundoFilter.data('multiselect')) {
                            fundoFilter.multiselect('destroy');
                            console.log('🔄 Multiselect de fundos destruído');
                        }
                    } catch (e) {
                        console.log('🔄 Nenhum multiselect de fundos para destruir');
                    }
                    
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
                    
                    console.log('Multiselect de fundos inicializado com sucesso');
                } catch (error) {
                    console.error('Erro ao inicializar multiselect de fundos:', error);
                }
            }
        }, 50);

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

        // 🆕 CHAMAR updateDependentFilters para usuários multi-franqueado após o setup inicial
        setTimeout(() => {
            console.log('🔄 Chamando updateDependentFilters para usuário multi-franqueado...');
            retryUpdateDependentFilters(userAccessLevel);
        }, 150);

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
        const funilUnidade = funilData ? funilData.filter(d => d.nm_unidade === userAccessLevel) : [];

        // Popular filtro de cursos baseado na página atual
        let cursosUnidade = [];
        if (isFunilPage) {
            // Para página do funil, usar coluna D do funil (Qual é o seu curso?)
            cursosUnidade = [...new Set(funilUnidade.map(d => d.curso || ''))].filter(c => c && c.trim() !== '' && c !== 'N/A').sort();
            console.log('Cursos do funil (usuário único):', cursosUnidade);
        } else {
            // Para outras páginas, usar dados de vendas e fundos
            cursosUnidade = [...new Set([
                ...dadosUnidade.map(d => d.curso_fundo || ''),
                ...fundosUnidade.map(d => d.curso_fundo || '')
            ])].filter(c => c && c !== 'N/A').sort();
        }

        cursosUnidade.forEach(c => {
            cursoFilter.append($("<option>", { value: c, text: c }));
        });

        // Popular filtro de fundos (apenas se não deve ocultar FUNDOS)
        if (!shouldHideFundos) {
            const fundosDisponiveis = [...new Set([
                ...dadosUnidade.map(d => d.nm_fundo || ''),
                ...fundosUnidade.map(d => d.nm_fundo || '')
            ])].filter(f => f && f !== 'N/A').sort();

            fundosDisponiveis.forEach(f => {
                fundoFilter.append($("<option>", { value: f, text: f }));
            });
        }

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

        // Configurar multiselect para fundos (apenas se não deve ocultar FUNDOS)
        if (!shouldHideFundos) {
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

        // 🆕 ADICIONAR FILTROS ESPECÍFICOS DO FUNIL para usuário único
        if (isFunilPage && funilUnidade && funilUnidade.length > 0) {
            console.log('🎯 POPULANDO FILTROS DO FUNIL para usuário único');
            
            // Popular filtro de consultores
            const consultoresUnidade = [...new Set(funilUnidade.map(d => d.consultor || ''))].filter(c => c && c.trim() !== '' && c !== 'N/A').sort();
            console.log('Consultores da unidade (usuário único):', consultoresUnidade);
            consultoresUnidade.forEach(c => {
                consultorFilter.append($("<option>", { value: c, text: c }));
            });

            // Popular filtro de origem do lead
            const origensLeadUnidade = [...new Set(funilUnidade.map(d => d.origem_lead || ''))].filter(o => o && o.trim() !== '' && o !== 'N/A').sort();
            console.log('Origens do lead da unidade (usuário único):', origensLeadUnidade);
            origensLeadUnidade.forEach(o => {
                origemLeadFilter.append($("<option>", { value: o, text: o }));
            });

            // Popular filtro de segmentação lead
            const segmentacoesUnidade = [...new Set(funilUnidade.map(d => d.segmentacao_lead || ''))].filter(s => s && s.trim() !== '' && s !== 'N/A').sort();
            console.log('Segmentações da unidade (usuário único):', segmentacoesUnidade);
            segmentacoesUnidade.forEach(s => {
                segmentacaoLeadFilter.append($("<option>", { value: s, text: s }));
            });

            // Popular filtro de etiquetas
            const etiquetasUnidade = [...new Set(funilUnidade.map(d => d.etiquetas || ''))].filter(e => e && e.trim() !== '' && e !== 'N/A').sort();
            console.log('Etiquetas da unidade (usuário único):', etiquetasUnidade);
            etiquetasUnidade.forEach(e => {
                etiquetasFilter.append($("<option>", { value: e, text: e }));
            });

            // Configurar multiselects para os filtros do funil
            [
                { filter: consultorFilter, name: 'consultores', text: 'Todos os consultores' },
                { filter: origemLeadFilter, name: 'origens', text: 'Todas as origens' },
                { filter: segmentacaoLeadFilter, name: 'segmentações', text: 'Todas as segmentações' },
                { filter: etiquetasFilter, name: 'etiquetas', text: 'Todas as etiquetas' }
            ].forEach(({ filter, name, text }) => {
                filter.multiselect({
                    enableFiltering: true,
                    includeSelectAllOption: true,
                    selectAllText: "Marcar todos",
                    filterPlaceholder: "Pesquisar...",
                    nonSelectedText: text,
                    nSelectedText: name,
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
            });

            console.log('✅ Filtros do funil configurados para usuário único');
        }
    }

    // 🆕 INICIALIZAÇÃO DOS FILTROS TIPO SERVIÇO E INSTITUIÇÃO
    // Adicionar inicialização básica para mostrar texto padrão correto
    const tipoServicoFilter = $("#tipo-servico-filter");
    const instituicaoFilter = $("#instituicao-filter");
    
    try {
        console.log('🔧 Inicializando filtros Tipo Serviço e Instituição com texto padrão...');
        
        // Inicializar Tipo Serviço com texto padrão
        if (tipoServicoFilter.length && !tipoServicoFilter.data('multiselect')) {
            tipoServicoFilter.multiselect({
                includeSelectAllOption: true,
                selectAllText: "Marcar todos",
                allSelectedText: "Todos os tipos",
                nonSelectedText: "Todos os tipos",
                enableFiltering: false,
                buttonWidth: '100%',
                maxHeight: 300,
                numberDisplayed: 2,
                onChange: function() {
                    // Só atualizar se estivermos na página 2
                    const currentPage = document.getElementById('btn-page2')?.classList.contains('active') ? 'page2' : 'other';
                    if (currentPage === 'page2') {
                        updateDashboard();
                    }
                },
                onSelectAll: function() {
                    const currentPage = document.getElementById('btn-page2')?.classList.contains('active') ? 'page2' : 'other';
                    if (currentPage === 'page2') {
                        updateDashboard();
                    }
                },
                onDeselectAll: function() {
                    const currentPage = document.getElementById('btn-page2')?.classList.contains('active') ? 'page2' : 'other';
                    if (currentPage === 'page2') {
                        updateDashboard();
                    }
                }
            });
            console.log('✅ Filtro Tipo Serviço inicializado com texto padrão');
        }
        
        // Inicializar Instituição com texto padrão
        if (instituicaoFilter.length && !instituicaoFilter.data('multiselect')) {
            instituicaoFilter.multiselect({
                enableFiltering: true,
                includeSelectAllOption: true,
                selectAllText: "Marcar todos",
                filterPlaceholder: "Pesquisar...",
                allSelectedText: "Todas as instituições",
                nonSelectedText: "Todas as instituições",
                buttonWidth: '100%',
                maxHeight: 300,
                numberDisplayed: 2,
                enableCaseInsensitiveFiltering: true,
                filterBehavior: 'text',
                onChange: function() {
                    // Só atualizar se estivermos na página 2
                    const currentPage = document.getElementById('btn-page2')?.classList.contains('active') ? 'page2' : 'other';
                    if (currentPage === 'page2') {
                        updateDashboard();
                    }
                },
                onSelectAll: function() {
                    const currentPage = document.getElementById('btn-page2')?.classList.contains('active') ? 'page2' : 'other';
                    if (currentPage === 'page2') {
                        updateDashboard();
                    }
                },
                onDeselectAll: function() {
                    const currentPage = document.getElementById('btn-page2')?.classList.contains('active') ? 'page2' : 'other';
                    if (currentPage === 'page2') {
                        updateDashboard();
                    }
                }
            });
            console.log('✅ Filtro Instituição inicializado com texto padrão');
        }
        
        // Inicializar Tipo de Adesão com texto padrão
        const tipoAdesaoFilter = $("#tipo-adesao-filter");
        if (tipoAdesaoFilter.length && !tipoAdesaoFilter.data('multiselect')) {
            tipoAdesaoFilter.multiselect({
                includeSelectAllOption: true,
                selectAllText: "Marcar todos",
                allSelectedText: "Todos os tipos",
                nonSelectedText: "Todos os tipos",
                enableFiltering: false,
                buttonWidth: '100%',
                maxHeight: 300,
                numberDisplayed: 2,
                onChange: function() {
                    // Só atualizar se estivermos na página 2
                    const currentPage = document.getElementById('btn-page2')?.classList.contains('active') ? 'page2' : 'other';
                    if (currentPage === 'page2') {
                        updateDashboard();
                    }
                },
                onSelectAll: function() {
                    const currentPage = document.getElementById('btn-page2')?.classList.contains('active') ? 'page2' : 'other';
                    if (currentPage === 'page2') {
                        updateDashboard();
                    }
                },
                onDeselectAll: function() {
                    const currentPage = document.getElementById('btn-page2')?.classList.contains('active') ? 'page2' : 'other';
                    if (currentPage === 'page2') {
                        updateDashboard();
                    }
                }
            });
            console.log('✅ Filtro Tipo de Adesão inicializado com texto padrão');
        }
        
    } catch (error) {
        console.error('❌ Erro ao inicializar filtros básicos:', error);
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

// --- FUNÇÃO AUXILIAR GLOBAL PARA CAMPO AUXILIAR ---
function getCampoAuxiliar(concatMotivoPerda) {
    if (!concatMotivoPerda || concatMotivoPerda.trim() === '') return '';
    
    const motivo = concatMotivoPerda.trim();
    
    switch (motivo) {
        case "Outro Motivo (especifique no campo de texto)":
            return "Outro Motivo (especifique no campo de texto)";
        case "Fechou com o Concorrente":
            return "Fechou com o Concorrente";
        case "Desistiu de Fazer o Fundo de Formatura":
            return "Desistiu de Fazer o Fundo de Formatura";
        case "Lead Duplicado (já existe outra pessoa da turma negociando - especifique o nome)":
            return "Descarte - Lead Duplicado (já existe outra pessoa da turma negociando - especifique o nome)";
        case "Falta de Contato no Grupo (durante negociação)":
            return "Falta de Contato no Grupo (durante negociação)";
        case "Falta de Contato Inicial (não responde)":
            return "Falta de Contato Inicial (não responde)";
        case "Território Inviável (não atendido por franquia VIVA)":
            return "Descarte - Território Inviável (não atendido por franquia VIVA)";
        case "Falta de Contato Inicial (telefone errado)":
            return "Descarte - Falta de Contato Inicial (telefone errado)";
        case "Pediu para retomar contato no próximo semestre":
            return "Descarte - Pediu para retomar contato no próximo semestre";
        case "Tipo de Ensino/Curso não atendido":
            return "Descarte - Tipo de Ensino/Curso não atendido";
        case "Adesão individual":
            return "Descarte - Adesão Individual";
        case "Adesão individual:":
            return "Descarte - Adesão Individual";
        case "Tipo de Ensino/Curso não atendido:":
            return "Descarte - Tipo de Ensino/Curso não atendido";
        default:
            return motivo;
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
        document.getElementById("funil-qualificacao-comissao").textContent = "0";
        document.getElementById("funil-reuniao-realizada").textContent = "0";
        document.getElementById("funil-propostas-enviadas").textContent = "0";
        document.getElementById("funil-contratos-fechados").textContent = "0";
        document.getElementById("funil-leads-perdidos").textContent = "0";
        document.getElementById("funil-leads-desqualificados").textContent = "0";
        return;
    }
    
    console.log("✅ Dados disponíveis:", funilData.length, "registros");
    
    // Debug: verificar quantos registros têm títulos válidos
    const registrosComTitulo = funilData.filter(item => item.titulo && item.titulo.trim() !== '');
    console.log("📋 Registros com título válido:", registrosComTitulo.length, "de", funilData.length, "total");
    
    // Debug: verificar quantos registros têm datas válidas
    const registrosComData = funilData.filter(item => item.criado_em && item.criado_em.trim() !== '');
    console.log("📅 Registros com data de criação:", registrosComData.length, "de", funilData.length, "total");
    
    // Função para converter data DD/MM/YYYY para objeto Date
    const parseDate = (dateString) => {
        if (!dateString || typeof dateString !== 'string') return null;
        
        // Tenta primeiro o formato DD/MM/YYYY
        const parts = dateString.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (parts) {
            return new Date(parts[3], parts[2] - 1, parts[1]); // ano, mês-1, dia
        }
        
        // Fallback: tenta outros formatos
        const date = new Date(dateString);
        return isNaN(date) ? null : date;
    };
    
    // PASSO 1: FILTRAR POR PERÍODO DE DATA
    let dadosFiltradosPorData = funilData.filter(item => {
        if (!item.criado_em) {
            console.log("⚠️ Item sem data de criação:", item.titulo);
            return false; // Excluir itens sem data
        }
        
        const dataItem = parseDate(item.criado_em);
        if (!dataItem) {
            console.log("⚠️ Data inválida encontrada:", {
                titulo: item.titulo,
                dataOriginal: item.criado_em,
                unidade: item.nm_unidade
            });
            return false;
        }
        
        // Verificar se a data está dentro do período
        const dentroIntervalo = dataItem >= startDate && dataItem < endDate;
        
        if (!dentroIntervalo) {
            console.log("📅 Data fora do intervalo:", {
                titulo: item.titulo,
                data: item.criado_em,
                dataParsed: dataItem.toLocaleDateString('pt-BR'),
                unidade: item.nm_unidade,
                startDate: startDate.toLocaleDateString('pt-BR'),
                endDate: endDate.toLocaleDateString('pt-BR')
            });
        } else {
            console.log("✅ Data válida:", {
                titulo: item.titulo,
                data: item.criado_em,
                dataParsed: dataItem.toLocaleDateString('pt-BR'),
                unidade: item.nm_unidade
            });
        }
        
        return dentroIntervalo;
    });
    
    console.log("� Dados após filtro de data (${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}):", dadosFiltradosPorData.length, "registros");
    
    // Debug detalhado: mostrar TODOS os registros que passaram pelo filtro de data
    console.log("🔍 TODOS os registros após filtro de data:");
    dadosFiltradosPorData.forEach((item, index) => {
      console.log(`  ${index + 1}. "${item.titulo}" | ${item.criado_em} | ${item.nm_unidade}`);
    });
    
    // PASSO 2: FILTRAR POR UNIDADE (se selecionadas)
    let dadosFinaisFiltrados = dadosFiltradosPorData;
    
    if (selectedUnidades && selectedUnidades.length > 0) {
        console.log("🔍 Filtrando por unidades:", selectedUnidades);
        
        // Verificar se estamos na página do funil - melhorando a detecção
        const btnFunil = document.getElementById('btn-page3');
        const pageFunil = document.getElementById('page3');
        const isFunilPage = (btnFunil && btnFunil.classList.contains('active')) || 
                           (pageFunil && (pageFunil.style.display === 'block' || pageFunil.classList.contains('active')));
        
        console.log("🔍 Detecção da página do funil:", {
            btnFunilActive: btnFunil?.classList.contains('active'),
            pageFunilDisplay: pageFunil?.style.display,
            pageFunilClass: pageFunil?.classList.contains('active'),
            isFunilPage: isFunilPage
        });
        
        // Aplicar filtro de unidade normalmente em todas as páginas, incluindo funil
        dadosFinaisFiltrados = dadosFiltradosPorData.filter(item => {
            const unidadeItem = item.nm_unidade;
            if (!unidadeItem) {
                console.log("⚠️ Item sem unidade:", item);
                return false;
            }
            
            const pertenceUnidade = selectedUnidades.includes(unidadeItem);
            
            if (!pertenceUnidade) {
                console.log("❌ Unidade não está no filtro:", {
                    titulo: item.titulo,
                    unidade: unidadeItem,
                    unidadesPermitidas: selectedUnidades
                });
            } else {
                console.log("✅ Unidade aceita:", {
                    titulo: item.titulo,
                    unidade: unidadeItem
                });
            }
            
            return pertenceUnidade;
        });
        
        console.log("📊 Dados após filtro de unidade:", dadosFinaisFiltrados.length, "registros");
    } else {
        console.log("📊 Mantendo todos os dados (sem filtro de unidade)");
    }
    
    // PASSO 2.5: FILTRAR POR CURSO (se estiver na página do funil e curso selecionado)
    const selectedCursos = $("#curso-filter").val() || [];
    if (selectedCursos && selectedCursos.length > 0) {
        console.log("🔍 Filtrando por cursos:", selectedCursos);
        
        dadosFinaisFiltrados = dadosFinaisFiltrados.filter(item => {
            const cursoItem = item.curso;
            if (!cursoItem || cursoItem.trim() === '') {
                console.log("⚠️ Item sem curso:", {
                    titulo: item.titulo,
                    curso: cursoItem
                });
                return false;
            }
            
            const cursoPertence = selectedCursos.includes(cursoItem.trim());
            
            if (!cursoPertence) {
                console.log("❌ Curso não está no filtro:", {
                    titulo: item.titulo,
                    curso: cursoItem,
                    cursosPermitidos: selectedCursos
                });
            } else {
                console.log("✅ Curso aceito:", {
                    titulo: item.titulo,
                    curso: cursoItem
                });
            }
            
            return cursoPertence;
        });
        
        console.log("📊 Dados após filtro de curso:", dadosFinaisFiltrados.length, "registros");
    } else {
        console.log("📊 Mantendo todos os dados (sem filtro de curso)");
    }
    
    // PASSO 2.6: FILTRAR POR CONSULTOR (se estiver na página do funil e consultor selecionado)
    const selectedConsultores = $("#consultor-filter").val() || [];
    if (selectedConsultores && selectedConsultores.length > 0) {
        console.log("🔍 Filtrando por consultores:", selectedConsultores);
        
        dadosFinaisFiltrados = dadosFinaisFiltrados.filter(item => {
            const consultorItem = item.consultor;
            if (!consultorItem || consultorItem.trim() === '') {
                console.log("⚠️ Item sem consultor:", {
                    titulo: item.titulo,
                    consultor: consultorItem
                });
                return false;
            }
            
            const consultorPertence = selectedConsultores.includes(consultorItem.trim());
            
            if (!consultorPertence) {
                console.log("❌ Consultor não está no filtro:", {
                    titulo: item.titulo,
                    consultor: consultorItem,
                    consultoresPermitidos: selectedConsultores
                });
            } else {
                console.log("✅ Consultor aceito:", {
                    titulo: item.titulo,
                    consultor: consultorItem
                });
            }
            
            return consultorPertence;
        });
        
        console.log("📊 Dados após filtro de consultor:", dadosFinaisFiltrados.length, "registros");
    } else {
        console.log("📊 Mantendo todos os dados (sem filtro de consultor)");
    }

    // PASSO 2.7: FILTRAR POR ORIGEM DO LEAD (se estiver na página do funil e origem selecionada)
    const selectedOrigensLead = $("#origem-lead-filter").val() || [];
    if (selectedOrigensLead && selectedOrigensLead.length > 0) {
        console.log("🔍 Filtrando por origens do lead:", selectedOrigensLead);
        
        dadosFinaisFiltrados = dadosFinaisFiltrados.filter(item => {
            const origemLeadItem = item.origem_lead;
            if (!origemLeadItem || origemLeadItem.trim() === '') {
                console.log("⚠️ Item sem origem do lead:", {
                    titulo: item.titulo,
                    origem_lead: origemLeadItem
                });
                return false;
            }
            
            const origemPertence = selectedOrigensLead.includes(origemLeadItem.trim());
            
            if (!origemPertence) {
                console.log("❌ Origem do lead não está no filtro:", {
                    titulo: item.titulo,
                    origem_lead: origemLeadItem,
                    origensPermitidas: selectedOrigensLead
                });
            } else {
                console.log("✅ Origem do lead aceita:", {
                    titulo: item.titulo,
                    origem_lead: origemLeadItem
                });
            }
            
            return origemPertence;
        });
        
        console.log("📊 Dados após filtro de origem do lead:", dadosFinaisFiltrados.length, "registros");
    } else {
        console.log("📊 Mantendo todos os dados (sem filtro de origem do lead)");
    }

    // PASSO 2.8: FILTRAR POR SEGMENTAÇÃO LEAD (se estiver na página do funil e segmentação selecionada)
    const selectedSegmentacoesLead = $("#segmentacao-lead-filter").val() || [];
    if (selectedSegmentacoesLead && selectedSegmentacoesLead.length > 0) {
        console.log("🔍 Filtrando por segmentações do lead:", selectedSegmentacoesLead);
        
        dadosFinaisFiltrados = dadosFinaisFiltrados.filter(item => {
            const segmentacaoLeadItem = item.segmentacao_lead;
            if (!segmentacaoLeadItem || segmentacaoLeadItem.trim() === '') {
                console.log("⚠️ Item sem segmentação do lead:", {
                    titulo: item.titulo,
                    segmentacao_lead: segmentacaoLeadItem
                });
                return false;
            }
            
            const segmentacaoPertence = selectedSegmentacoesLead.includes(segmentacaoLeadItem.trim());
            
            if (!segmentacaoPertence) {
                console.log("❌ Segmentação do lead não está no filtro:", {
                    titulo: item.titulo,
                    segmentacao_lead: segmentacaoLeadItem,
                    segmentacoesPermitidas: selectedSegmentacoesLead
                });
            } else {
                console.log("✅ Segmentação do lead aceita:", {
                    titulo: item.titulo,
                    segmentacao_lead: segmentacaoLeadItem
                });
            }
            
            return segmentacaoPertence;
        });
        
        console.log("📊 Dados após filtro de segmentação do lead:", dadosFinaisFiltrados.length, "registros");
    } else {
        console.log("📊 Mantendo todos os dados (sem filtro de segmentação do lead)");
    }

    // PASSO 2.9: FILTRAR POR ETIQUETAS (se estiver na página do funil e etiquetas selecionadas)
    const selectedEtiquetas = $("#etiquetas-filter").val() || [];
    if (selectedEtiquetas && selectedEtiquetas.length > 0) {
        console.log("🔍 Filtrando por etiquetas:", selectedEtiquetas);
        
        dadosFinaisFiltrados = dadosFinaisFiltrados.filter(item => {
            const etiquetasItem = item.etiquetas;
            if (!etiquetasItem || etiquetasItem.trim() === '') {
                console.log("⚠️ Item sem etiquetas:", {
                    titulo: item.titulo,
                    etiquetas: etiquetasItem
                });
                return false;
            }
            
            const etiquetasPertence = selectedEtiquetas.includes(etiquetasItem.trim());
            
            if (!etiquetasPertence) {
                console.log("❌ Etiquetas não estão no filtro:", {
                    titulo: item.titulo,
                    etiquetas: etiquetasItem,
                    etiquetasPermitidas: selectedEtiquetas
                });
            } else {
                console.log("✅ Etiquetas aceitas:", {
                    titulo: item.titulo,
                    etiquetas: etiquetasItem
                });
            }
            
            return etiquetasPertence;
        });
        
        console.log("📊 Dados após filtro de etiquetas:", dadosFinaisFiltrados.length, "registros");
    } else {
        console.log("📊 Mantendo todos os dados (sem filtro de etiquetas)");
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
    
    // PASSO 5: Calcular e atualizar o card "Qualificação Comissão"
    // Contar apenas registros que têm valor preenchido na coluna qualificacao_comissao
    const leadsComQualificacaoComissao = dadosFinaisFiltrados.filter(item => {
        return item.titulo && item.titulo.trim() !== '' && // tem título válido
               item.qualificacao_comissao && item.qualificacao_comissao.trim() !== ''; // tem qualificação preenchida
    });
    
    const totalQualificacaoComissao = leadsComQualificacaoComissao.length;
    console.log("📊 Total de leads com Qualificação Comissão preenchida:", totalQualificacaoComissao);
    
    // Mostrar amostra dos dados de qualificação comissão
    if (leadsComQualificacaoComissao.length > 0) {
        console.log("🔍 Amostra dos leads com Qualificação Comissão:");
        leadsComQualificacaoComissao.slice(0, 5).forEach((item, index) => {
            console.log(`  ${index + 1}. Título: "${item.titulo}" | Qualificação: "${item.qualificacao_comissao}" | Unidade: "${item.nm_unidade}"`);
        });
    }
    
    // Atualizar o card de Qualificação Comissão
    const qualificacaoCardElement = document.getElementById("funil-qualificacao-comissao");
    if (qualificacaoCardElement) {
        qualificacaoCardElement.textContent = totalQualificacaoComissao.toString();
        console.log("✅ Card 'Qualificação Comissão' atualizado com:", totalQualificacaoComissao);
    } else {
        console.error("❌ Elemento 'funil-qualificacao-comissao' não encontrado");
    }
    
    // PASSO 6: Calcular e atualizar o card "Reunião Realizada"
    // Regra: Se "Diagnóstico Realizado" é NULL E "Proposta Enviada" é NULL = 0, senão = 1
    // IMPORTANTE: Só contar quando a data de criação está no período (dadosFinaisFiltrados já tem isso)
    const leadsComReuniaoRealizada = dadosFinaisFiltrados.filter(item => {
        if (!item.titulo || item.titulo.trim() === '') return false; // tem título válido
        
        const diagnosticoVazio = !item.diagnostico_realizado || item.diagnostico_realizado.trim() === '';
        const propostaVazia = !item.proposta_enviada || item.proposta_enviada.trim() === '';
        
        // Se AMBOS são vazios/NULL, retorna false (não conta = 0)
        // Se pelo menos UM tem valor, retorna true (conta = 1)
        const temReuniaoRealizada = !(diagnosticoVazio && propostaVazia);
        
        console.log("🔍 Análise de reunião realizada:", {
            titulo: item.titulo,
            diagnostico: item.diagnostico_realizado || 'NULL',
            proposta: item.proposta_enviada || 'NULL',
            diagnosticoVazio: diagnosticoVazio,
            propostaVazia: propostaVazia,
            temReuniaoRealizada: temReuniaoRealizada,
            criado_em: item.criado_em
        });
        
        return temReuniaoRealizada;
    });
    
    const totalReuniaoRealizada = leadsComReuniaoRealizada.length;
    console.log("📊 Total de leads com Reunião Realizada (período filtrado):", totalReuniaoRealizada);
    console.log("📊 Total de leads analisados (período filtrado):", dadosFinaisFiltrados.length);
    
    // Debug detalhado: mostrar estatísticas
    const leadsComDiagnostico = dadosFinaisFiltrados.filter(item => 
        item.titulo && item.titulo.trim() !== '' && 
        item.diagnostico_realizado && item.diagnostico_realizado.trim() !== ''
    );
    const leadsComProposta = dadosFinaisFiltrados.filter(item => 
        item.titulo && item.titulo.trim() !== '' && 
        item.proposta_enviada && item.proposta_enviada.trim() !== ''
    );
    
    console.log("📊 Estatísticas detalhadas:");
    console.log("  - Leads com Diagnóstico preenchido:", leadsComDiagnostico.length);
    console.log("  - Leads com Proposta preenchida:", leadsComProposta.length);
    console.log("  - Leads com pelo menos um preenchido (Reunião Realizada):", totalReuniaoRealizada);
    
    // Mostrar amostra dos dados de reunião realizada
    if (leadsComReuniaoRealizada.length > 0) {
        console.log("🔍 Amostra dos leads com Reunião Realizada:");
        leadsComReuniaoRealizada.slice(0, 5).forEach((item, index) => {
            console.log(`  ${index + 1}. Título: "${item.titulo}" | Diagnóstico: "${item.diagnostico_realizado || 'NULL'}" | Proposta: "${item.proposta_enviada || 'NULL'}" | Data: "${item.criado_em}"`);
        });
    }
    
    // Atualizar o card de Reunião Realizada
    const reuniaoCardElement = document.getElementById("funil-reuniao-realizada");
    if (reuniaoCardElement) {
        reuniaoCardElement.textContent = totalReuniaoRealizada.toString();
        console.log("✅ Card 'Reunião Realizada' atualizado com:", totalReuniaoRealizada);
    } else {
        console.error("❌ Elemento 'funil-reuniao-realizada' não encontrado");
    }
    
    // PASSO 7: Calcular e atualizar o card "Propostas Enviadas"
    // Regra: count(Primeira vez que entrou na fase 3.1 Proposta Enviada)
    // IMPORTANTE: Só contar quando a data de criação está no período (dadosFinaisFiltrados já tem isso)
    const leadsComPropostaEnviada = dadosFinaisFiltrados.filter(item => {
        if (!item.titulo || item.titulo.trim() === '') return false; // tem título válido
        
        const temPropostaEnviada = item.proposta_enviada && item.proposta_enviada.trim() !== '';
        
        if (temPropostaEnviada) {
            console.log("✅ Lead com proposta enviada:", {
                titulo: item.titulo,
                proposta_enviada: item.proposta_enviada,
                criado_em: item.criado_em,
                unidade: item.nm_unidade
            });
        }
        
        return temPropostaEnviada;
    });
    
    const totalPropostasEnviadas = leadsComPropostaEnviada.length;
    console.log("📊 Total de leads com Propostas Enviadas (período filtrado):", totalPropostasEnviadas);
    
    // Mostrar amostra dos dados de propostas enviadas
    if (leadsComPropostaEnviada.length > 0) {
        console.log("🔍 Amostra dos leads com Propostas Enviadas:");
        leadsComPropostaEnviada.slice(0, 5).forEach((item, index) => {
            console.log(`  ${index + 1}. Título: "${item.titulo}" | Proposta: "${item.proposta_enviada}" | Data: "${item.criado_em}" | Unidade: "${item.nm_unidade}"`);
        });
    }
    
    // Atualizar o card de Propostas Enviadas
    const propostasEnviadasCardElement = document.getElementById("funil-propostas-enviadas");
    if (propostasEnviadasCardElement) {
        propostasEnviadasCardElement.textContent = totalPropostasEnviadas.toString();
        console.log("✅ Card 'Propostas Enviadas' atualizado com:", totalPropostasEnviadas);
    } else {
        console.error("❌ Elemento 'funil-propostas-enviadas' não encontrado");
    }
    
    // PASSO 8: Calcular e atualizar o card "Contratos Fechados Comissão"
    // Regra: COUNT(Primeira vez que entrou na fase 4.1 Fechamento Comissão)
    // IMPORTANTE: Só contar quando a data de criação está no período (dadosFinaisFiltrados já tem isso)
    const leadsComFechamentoComissao = dadosFinaisFiltrados.filter(item => {
        if (!item.titulo || item.titulo.trim() === '') return false; // tem título válido
        
        const temFechamentoComissao = item.fechamento_comissao && item.fechamento_comissao.trim() !== '';
        
        if (temFechamentoComissao) {
            console.log("✅ Lead com fechamento comissão:", {
                titulo: item.titulo,
                fechamento_comissao: item.fechamento_comissao,
                criado_em: item.criado_em,
                unidade: item.nm_unidade
            });
        }
        
        return temFechamentoComissao;
    });
    
    const totalFechamentoComissao = leadsComFechamentoComissao.length;
    console.log("📊 Total de leads com Fechamento Comissão (período filtrado):", totalFechamentoComissao);
    
    // Mostrar amostra dos dados de fechamento comissão
    if (leadsComFechamentoComissao.length > 0) {
        console.log("🔍 Amostra dos leads com Fechamento Comissão:");
        leadsComFechamentoComissao.slice(0, 5).forEach((item, index) => {
            console.log(`  ${index + 1}. Título: "${item.titulo}" | Fechamento: "${item.fechamento_comissao}" | Data: "${item.criado_em}" | Unidade: "${item.nm_unidade}"`);
        });
    }
    
    // Atualizar o card de Contratos Fechados Comissão
    const contratosCardElement = document.getElementById("funil-contratos-fechados");
    if (contratosCardElement) {
        contratosCardElement.textContent = totalFechamentoComissao.toString();
        console.log("✅ Card 'Contratos Fechados Comissão' atualizado com:", totalFechamentoComissao);
    } else {
        console.error("❌ Elemento 'funil-contratos-fechados' não encontrado");
    }
    
    // PASSO 9: Calcular e atualizar o card "Leads Perdidos"
    // Regra complexa: Leads na fase 7.2 Perdido, mas com várias condições de descarte
    
    // Primeiro, vamos ver o que temos na coluna fase_perdido
    console.log("🔍 Analisando coluna fase_perdido nos primeiros 10 registros:");
    dadosFinaisFiltrados.slice(0, 10).forEach((item, index) => {
        if (item.fase_perdido && item.fase_perdido.trim() !== '') {
            console.log(`  ${index + 1}. Título: "${item.titulo}" | Fase Perdido: "${item.fase_perdido}" | Motivo: "${item.concat_motivo_perda}"`);
        }
    });
    
    const leadsComFasePerdido = dadosFinaisFiltrados.filter(item => {
        if (!item.titulo || item.titulo.trim() === '') return false; // tem título válido
        
        // 1. Verificar se está realmente na fase 7.2 Perdido
        // A fase perdido deve conter explicitamente "7.2" ou "Perdido"
        const estaNaFasePerdido = item.fase_perdido && 
                                 item.fase_perdido.trim() !== '' && 
                                 (item.fase_perdido.includes("7.2") || 
                                  item.fase_perdido.toLowerCase().includes("perdido"));
        
        if (!estaNaFasePerdido) {
            return false;
        }
        
        // 2. Deve ter motivo da perda preenchido
        if (!item.concat_motivo_perda || item.concat_motivo_perda.trim() === '') {
            console.log("❌ Lead perdido descartado (motivo vazio):", {
                titulo: item.titulo,
                fase_perdido: item.fase_perdido,
                concat_motivo_perda: 'VAZIO'
            });
            return false;
        }
        
        // 3. Aplicar a regra do campo auxiliar e verificar se começa com "Descarte"
        const campoAuxiliar = getCampoAuxiliar(item.concat_motivo_perda);
        const comecaComDescarte = campoAuxiliar.startsWith("Descarte");
        
        if (comecaComDescarte) {
            console.log("❌ Lead perdido descartado (inicia com 'Descarte'):", {
                titulo: item.titulo,
                concat_motivo_perda: item.concat_motivo_perda,
                campo_auxiliar: campoAuxiliar
            });
            return false;
        }
        
        // 4. Se passou por todas as verificações, contar como lead perdido válido
        console.log("✅ Lead perdido válido:", {
            titulo: item.titulo,
            fase_perdido: item.fase_perdido,
            concat_motivo_perda: item.concat_motivo_perda,
            campo_auxiliar: campoAuxiliar,
            criado_em: item.criado_em,
            unidade: item.nm_unidade
        });
        
        return true;
    });
    
    const totalLeadsPerdidos = leadsComFasePerdido.length;
    console.log("📊 Total de Leads Perdidos válidos (período filtrado):", totalLeadsPerdidos);
    
    // Mostrar amostra dos dados de leads perdidos
    if (leadsComFasePerdido.length > 0) {
        console.log("🔍 Amostra dos Leads Perdidos válidos:");
        leadsComFasePerdido.slice(0, 5).forEach((item, index) => {
            console.log(`  ${index + 1}. Título: "${item.titulo}" | Motivo: "${item.concat_motivo_perda}" | Data: "${item.criado_em}"`);
        });
    }
    
    // Atualizar o card de Leads Perdidos
    const leadsPerdidosCardElement = document.getElementById("funil-leads-perdidos");
    if (leadsPerdidosCardElement) {
        leadsPerdidosCardElement.textContent = totalLeadsPerdidos.toString();
        console.log("✅ Card 'Leads Perdidos' atualizado com:", totalLeadsPerdidos);
    } else {
        console.error("❌ Elemento 'funil-leads-perdidos' não encontrado");
    }
    
    // PASSO 10: Calcular e atualizar o card "Leads Descartados/Desqualificados"
    // Regra: Mesma lógica dos perdidos, mas considera APENAS os que começam com "Descarte"
    
    const leadsDescartados = dadosFinaisFiltrados.filter(item => {
        if (!item.titulo || item.titulo.trim() === '') return false; // tem título válido
        
        // 1. Verificar se está realmente na fase 7.2 Perdido
        const estaNaFasePerdido = item.fase_perdido && 
                                 item.fase_perdido.trim() !== '' && 
                                 (item.fase_perdido.includes("7.2") || 
                                  item.fase_perdido.toLowerCase().includes("perdido"));
        
        if (!estaNaFasePerdido) {
            return false;
        }
        
        // 2. Deve ter motivo da perda preenchido
        if (!item.concat_motivo_perda || item.concat_motivo_perda.trim() === '') {
            return false;
        }
        
        // 3. Aplicar a regra do campo auxiliar e verificar se começa com "Descarte"
        const campoAuxiliar = getCampoAuxiliar(item.concat_motivo_perda);
        const comecaComDescarte = campoAuxiliar.startsWith("Descarte");
        
        if (comecaComDescarte) {
            console.log("✅ Lead descartado válido:", {
                titulo: item.titulo,
                concat_motivo_perda: item.concat_motivo_perda,
                campo_auxiliar: campoAuxiliar,
                criado_em: item.criado_em,
                unidade: item.nm_unidade
            });
            return true; // INCLUIR os que começam com "Descarte"
        }
        
        return false; // Descartar todos os outros
    });
    
    const totalLeadsDescartados = leadsDescartados.length;
    console.log("📊 Total de Leads Descartados válidos (período filtrado):", totalLeadsDescartados);
    
    // Mostrar amostra dos dados de leads descartados
    if (leadsDescartados.length > 0) {
        console.log("🔍 Amostra dos Leads Descartados válidos:");
        leadsDescartados.slice(0, 5).forEach((item, index) => {
            console.log(`  ${index + 1}. Título: "${item.titulo}" | Motivo: "${item.concat_motivo_perda}" | Data: "${item.criado_em}"`);
        });
    }
    
    // Atualizar o card de Leads Descartados
    const leadsDescartadosCardElement = document.getElementById("funil-leads-desqualificados");
    if (leadsDescartadosCardElement) {
        leadsDescartadosCardElement.textContent = totalLeadsDescartados.toString();
        console.log("✅ Card 'Leads Descartados/Desqualificados' atualizado com:", totalLeadsDescartados);
    } else {
        console.error("❌ Elemento 'funil-leads-desqualificados' não encontrado");
    }
    
    // PASSO 11: Atualizar a seção de captações
    updateCaptacoes(dadosFinaisFiltrados);
    
    // PASSO 11.5: Atualizar a tabela de motivos de perda detalhados
    console.log("🔍 Chamando updateMotivosPerdaTable com", dadosFinaisFiltrados.length, "registros");
    updateMotivosPerdaTable(dadosFinaisFiltrados);
    
    console.log("🔍 Chamando updateDescartesTable com", dadosFinaisFiltrados.length, "registros");
    updateDescartesTable(dadosFinaisFiltrados);
    
    console.log("🔍 Chamando updateConcorrentesTable com", dadosFinaisFiltrados.length, "registros");
    updateConcorrentesTable(dadosFinaisFiltrados);
    
    // PASSO 12: Atualizar o gráfico de negociações por fase
    createNegociacoesPorFaseChart(dadosFinaisFiltrados);
    
    // PASSO 13: Atualizar o gráfico de perdas por fase
    createPerdasPorFaseChart(dadosFinaisFiltrados);
    
    console.log("=== FIM updateFunilIndicators ===");
}

// Função para classificar o tipo de captação baseado na origem do lead
function getTipoCaptacao(origemLead) {
    if (!origemLead || origemLead.trim() === '') return 'Captação Ativa';
    
    const origem = origemLead.trim();
    
    switch (origem) {
        case "Presencial - Ligação/WPP Telefone Consultor (a)":
            return "Captação Passiva";
        case "Digital - Redes Sociais - VIVA Brasil":
            return "Captação Passiva - Exclusiva Viva BR";
        case "Digital - Redes Sociais - Instagram Local":
            return "Captação Passiva";
        case "Digital - Site VIVA Brasil":
            return "Captação Passiva - Exclusiva Viva BR";
        case "Digital - Card Google":
            return "Captação Passiva - Exclusiva Viva BR";
        case "Indicação - Via Atlética/DA/CA":
            return "Captação Passiva";
        case "Indicação - Via outra Franquia/Consultor VIVA":
            return "Captação Passiva";
        case "Digital - Redes Sociais - Instagram Consultor (a)":
            return "Captação Passiva";
        case "Presencial - Ligação Telefone Franquia":
            return "Captação Passiva";
        case "Indicação - Via Integrante de Turma":
            return "Captação Passiva";
        case "Presencial - Visita Sede Franquia":
            return "Captação Passiva";
        case "Digital - Campanha paga - Instagram Local":
            return "Captação Passiva";
        default:
            return "Captação Ativa";
    }
}

// Função para atualizar a seção de captações
function updateCaptacoes(dadosFiltrados) {
    console.log("=== INÍCIO updateCaptacoes ===");
    
    // Filtrar apenas leads com título válido
    const leadsValidos = dadosFiltrados.filter(item => 
        item.titulo && item.titulo.trim() !== ''
    );
    
    console.log("📊 Total de leads válidos para captações:", leadsValidos.length);
    
    // Agrupar por origem do lead
    const origemContador = {};
    const tipoContador = {};
    
    leadsValidos.forEach(item => {
        const origem = item.origem_lead || 'Não informado';
        const tipo = getTipoCaptacao(origem);
        
        // Contar por origem
        if (!origemContador[origem]) {
            origemContador[origem] = 0;
        }
        origemContador[origem]++;
        
        // Contar por tipo
        if (!tipoContador[tipo]) {
            tipoContador[tipo] = 0;
        }
        tipoContador[tipo]++;
    });
    
    console.log("📊 Contadores por origem:", origemContador);
    console.log("📊 Contadores por tipo:", tipoContador);
    
    // Criar dados para a tabela
    const dadosTabela = [];
    const totalLeads = leadsValidos.length;
    
    Object.keys(origemContador).forEach(origem => {
        const total = origemContador[origem];
        const percentual = ((total / totalLeads) * 100).toFixed(1);
        const tipo = getTipoCaptacao(origem);
        
        dadosTabela.push({
            origem,
            tipo,
            percentual: parseFloat(percentual),
            total
        });
    });
    
    // Ordenar por total (descendente)
    dadosTabela.sort((a, b) => b.total - a.total);
    
    // Atualizar tabela
    updateCaptacoesTable(dadosTabela);
    
    // Criar dados para o gráfico de pizza (agrupado por tipo)
    const dadosGrafico = Object.keys(tipoContador).map(tipo => ({
        tipo,
        total: tipoContador[tipo],
        percentual: ((tipoContador[tipo] / totalLeads) * 100).toFixed(1)
    }));
    
    // Atualizar gráfico
    updateCaptacoesChart(dadosGrafico);
    
    console.log("=== FIM updateCaptacoes ===");
}

// Função para atualizar a tabela de captações
function updateCaptacoesTable(dados) {
    const tbody = document.getElementById('captacoes-table-body');
    if (!tbody) {
        console.error("❌ Elemento 'captacoes-table-body' não encontrado");
        return;
    }
    
    // Limpar tabela
    tbody.innerHTML = '';
    
    // Calcular totais para a linha de resumo
    const totalAbsoluto = dados.reduce((sum, item) => sum + item.total, 0);
    const totalPercentual = dados.reduce((sum, item) => sum + item.percentual, 0);
    
    // Encontrar valores min e max para o mapa de calor (excluindo o total)
    const percentuais = dados.map(item => item.percentual);
    const maxPercent = Math.max(...percentuais);
    const minPercent = Math.min(...percentuais);
    
    // Função para determinar a classe do mapa de calor
    function getHeatClass(percentual) {
        const threshold1 = minPercent + (maxPercent - minPercent) * 0.33;
        const threshold2 = minPercent + (maxPercent - minPercent) * 0.66;
        
        if (percentual <= threshold1) return 'heat-low';
        if (percentual <= threshold2) return 'heat-medium';
        return 'heat-high';
    }
    
    // Preencher tabela com dados
    dados.forEach(item => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${item.origem}</td>
            <td>${item.tipo}</td>
            <td class="${getHeatClass(item.percentual)}">${item.percentual}%</td>
            <td class="${getHeatClass(item.percentual)}">${item.total}</td>
        `;
        
        tbody.appendChild(tr);
    });
    
    // Adicionar linha de resumo/total
    const trTotal = document.createElement('tr');
    trTotal.className = 'captacoes-table-footer';
    
    trTotal.innerHTML = `
        <td>TOTAL GERAL</td>
        <td>-</td>
        <td>${totalPercentual.toFixed(1)}%</td>
        <td>${totalAbsoluto}</td>
    `;
    
    tbody.appendChild(trTotal);
    
    console.log("✅ Tabela de captações atualizada com", dados.length, "itens + linha de resumo");
}

// Variável global para armazenar a instância do gráfico
let captacoesChartInstance = null;

// Função para atualizar o gráfico de captações
function updateCaptacoesChart(dados) {
    const ctx = document.getElementById('captacoesChart');
    if (!ctx) {
        console.error("❌ Elemento 'captacoesChart' não encontrado");
        return;
    }
    
    // Destruir gráfico anterior se existir
    if (captacoesChartInstance) {
        captacoesChartInstance.destroy();
    }
    
    // Cores para o gráfico
    const cores = [
        '#FFC107', // Amarelo principal
        '#FF8F00', // Laranja
        '#FF5722', // Vermelho
        '#9C27B0', // Roxo
        '#3F51B5', // Azul
        '#009688', // Verde água
        '#4CAF50', // Verde
        '#FF9800'  // Laranja claro
    ];
    
    const labels = dados.map(item => item.tipo);
    const valores = dados.map(item => item.total);
    const backgroundColor = dados.map((_, index) => cores[index % cores.length]);
    
    captacoesChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels, // Sem percentuais na legenda
            datasets: [{
                data: valores,
                backgroundColor: backgroundColor,
                borderColor: '#495057',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, /* Permitir que ocupe todo espaço */
            layout: {
                padding: {
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 180 /* Mais espaço à direita para legenda completa */
                }
            },
            plugins: {
                legend: {
                    position: 'right', // Legenda à direita
                    labels: {
                        color: '#FFFFFF', // Legenda branca
                        font: {
                            size: 18 // Fonte ainda maior para legenda
                        },
                        padding: 25, /* Ainda mais espaçamento */
                        usePointStyle: true,
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, index) => {
                                    const dataset = data.datasets[0];
                                    return {
                                        text: label, // Apenas o nome do tipo
                                        fillStyle: dataset.backgroundColor[index],
                                        strokeStyle: dataset.borderColor,
                                        lineWidth: dataset.borderWidth,
                                        pointStyle: 'circle',
                                        hidden: false,
                                        index: index,
                                        fontColor: '#FFFFFF' // Forçar cor branca
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(33, 37, 41, 0.9)',
                    titleColor: '#FFC107',
                    bodyColor: '#F8F9FA',
                    borderColor: '#495057',
                    borderWidth: 1,
                    titleFont: {
                        size: 16 // Fonte maior para título do tooltip
                    },
                    bodyFont: {
                        size: 14 // Fonte maior para corpo do tooltip
                    },
                    callbacks: {
                        label: function(context) {
                            const item = dados[context.dataIndex];
                            return `${item.tipo}: ${item.total} leads (${item.percentual}%)`;
                        }
                    }
                },
                datalabels: {
                    color: '#2c3e50',
                    font: {
                        weight: 'bold',
                        size: 20 /* Fonte muito maior para os rótulos */
                    },
                    formatter: function(value, context) {
                        const percentual = dados[context.dataIndex].percentual;
                        return `${percentual}%`;
                    }
                }
            }
        },
        plugins: [ChartDataLabels] // Plugin para exibir percentuais nas fatias
    });
    
    console.log("✅ Gráfico de captações atualizado com", dados.length, "categorias");
}

// === NOVA SEÇÃO: LEADS PERDIDOS DETALHADOS ===

// Função para atualizar a tabela de motivos de perda
function updateMotivosPerdaTable(dadosFiltrados) {
    console.log("=== INÍCIO updateMotivosPerdaTable ===");
    console.log("📊 Dados filtrados recebidos:", dadosFiltrados ? dadosFiltrados.length : 0);
    
    const tbody = document.getElementById('motivos-perda-table-body');
    if (!tbody) {
        console.error("❌ Elemento 'motivos-perda-table-body' não encontrado");
        return;
    }

    // Verificar se há dados do funil disponíveis
    if (!dadosFiltrados || dadosFiltrados.length === 0) {
        console.log("⚠️ Não há dados filtrados para processar motivos de perda");
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #adb5bd;">Nenhum dado disponível</td></tr>';
        return;
    }

    try {
        // Debug: Verificar estrutura dos dados
        console.log("🔍 Amostra dos primeiros 3 registros:", dadosFiltrados.slice(0, 3));
        
        // Debug: Verificar quantos leads têm fase_perdido preenchida
        const leadsComFasePerdidoPreenchida = dadosFiltrados.filter(item => 
            item && item.fase_perdido && item.fase_perdido.trim() !== ''
        );
        console.log("📊 Leads com fase_perdido preenchida:", leadsComFasePerdidoPreenchida.length);
        
        // Debug: Verificar quantos são da fase 7.2
        const leadsNaFase72 = dadosFiltrados.filter(item => 
            item && item.fase_perdido && 
            (item.fase_perdido.includes("7.2") || item.fase_perdido.toLowerCase().includes("perdido"))
        );
        console.log("📊 Leads na fase 7.2 Perdido:", leadsNaFase72.length);
        
        // Debug: Verificar quantos têm motivo preenchido
        const leadsComMotivo = dadosFiltrados.filter(item => 
            item && item.concat_motivo_perda && item.concat_motivo_perda.trim() !== ''
        );
        console.log("📊 Leads com motivo de perda preenchido:", leadsComMotivo.length);

        // Filtrar apenas leads perdidos VÁLIDOS (MESMA LÓGICA DO CARD - exclui os que começam com "Descarte")
        const leadsComFasePerdido = dadosFiltrados.filter(item => {
            try {
                if (!item.titulo || item.titulo.trim() === '') return false; // tem título válido
                
                // 1. Verificar se está realmente na fase 7.2 Perdido
                const estaNaFasePerdido = item.fase_perdido && 
                                         item.fase_perdido.trim() !== '' && 
                                         (item.fase_perdido.includes("7.2") || 
                                          item.fase_perdido.toLowerCase().includes("perdido"));
                
                if (!estaNaFasePerdido) return false;
                
                // 2. Deve ter motivo da perda preenchido
                if (!item.concat_motivo_perda || item.concat_motivo_perda.trim() === '') return false;
                
                // 3. Aplicar a regra do campo auxiliar e verificar se começa com "Descarte"
                const campoAuxiliar = getCampoAuxiliar(item.concat_motivo_perda);
                const comecaComDescarte = campoAuxiliar.startsWith("Descarte");
                
                console.log("🔍 Processando lead:", {
                    titulo: item.titulo,
                    motivo_original: item.concat_motivo_perda,
                    campo_auxiliar: campoAuxiliar,
                    comeca_com_descarte: comecaComDescarte
                });
                
                if (comecaComDescarte) {
                    console.log("❌ Lead descartado (motivo de descarte)");
                    return false; // EXCLUIR os que começam com "Descarte"
                }
                
                console.log("✅ Lead válido para tabela");
                return true;
            } catch (error) {
                console.error("Erro ao processar item:", item, error);
                return false;
            }
        });

        // Se não há leads válidos, mostrar mensagem
        if (leadsComFasePerdido.length === 0) {
            console.log("⚠️ Nenhum lead perdido válido encontrado");
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #adb5bd; padding: 20px;">Nenhum motivo de perda encontrado no período selecionado</td></tr>';
            console.log("=== FIM updateMotivosPerdaTable ===");
            return;
        }

        // Contar motivos de perda usando o campo auxiliar processado
        const motivoContador = {};
        let totalLeadsPerdidos = 0;

        leadsComFasePerdido.forEach(item => {
            try {
                // Usar o campo auxiliar processado ao invés do motivo original
                const campoAuxiliar = getCampoAuxiliar(item.concat_motivo_perda);
                const motivoFinal = campoAuxiliar || item.concat_motivo_perda.trim();
                
                if (motivoFinal) {
                    if (!motivoContador[motivoFinal]) {
                        motivoContador[motivoFinal] = 0;
                    }
                    motivoContador[motivoFinal]++;
                    totalLeadsPerdidos++;
                }
            } catch (error) {
                console.error("Erro ao contar motivo:", item, error);
            }
        });

        console.log("📈 Contagem de motivos:", motivoContador);
        console.log("📊 Total de leads perdidos contabilizados:", totalLeadsPerdidos);

        // Converter para array e ordenar por quantidade (descendente)
        const dadosTabela = Object.keys(motivoContador).map(motivo => ({
            motivo,
            total: motivoContador[motivo],
            percentual: totalLeadsPerdidos > 0 ? ((motivoContador[motivo] / totalLeadsPerdidos) * 100).toFixed(1) : 0
        })).sort((a, b) => b.total - a.total);

        // Limpar tabela
        tbody.innerHTML = '';

        // Adicionar linhas de dados
        dadosTabela.forEach(item => {
            try {
                const tr = document.createElement('tr');
                
                // Determinar classe do mapa de calor baseada na porcentagem
                let heatClass = 'heat-low';
                const percentualNumerico = parseFloat(item.percentual);
                if (percentualNumerico >= 30) {
                    heatClass = 'heat-high';
                } else if (percentualNumerico >= 15) {
                    heatClass = 'heat-medium';
                }
                
                tr.innerHTML = `
                    <td>${item.motivo}</td>
                    <td class="${heatClass}">${item.percentual}%</td>
                    <td class="${heatClass}">${item.total}</td>
                `;
                
                tbody.appendChild(tr);
            } catch (error) {
                console.error("Erro ao criar linha da tabela:", item, error);
            }
        });

        // Adicionar linha de resumo/total
        const totalPercentual = dadosTabela.reduce((sum, item) => sum + parseFloat(item.percentual), 0);
        const totalAbsoluto = dadosTabela.reduce((sum, item) => sum + item.total, 0);
        
        const trTotal = document.createElement('tr');
        trTotal.className = 'leads-perdidos-table-footer';
        
        trTotal.innerHTML = `
            <td><strong>TOTAL GERAL</strong></td>
            <td><strong>${totalPercentual.toFixed(1)}%</strong></td>
            <td><strong>${totalAbsoluto}</strong></td>
        `;
        
        tbody.appendChild(trTotal);

        console.log("✅ Tabela de motivos de perda atualizada com", dadosTabela.length, "motivos + linha de resumo");
        
    } catch (error) {
        console.error("❌ Erro geral na função updateMotivosPerdaTable:", error);
    }
    
    console.log("=== FIM updateMotivosPerdaTable ===");
}

// Função para atualizar a tabela de descartes (motivos que começam com "Descarte")
function updateDescartesTable(dadosFiltrados) {
    console.log("=== INÍCIO updateDescartesTable ===");
    
    try {
        const tbody = document.getElementById('descartes-table-body');
        if (!tbody) {
            console.error("❌ Elemento descartes-table-body não encontrado");
            return;
        }

        console.log("📊 Processando", dadosFiltrados.length, "registros para tabela de descartes");

        // Filtrar apenas leads que têm motivos de descarte
        const leadsComDescarte = dadosFiltrados.filter(item => {
            try {
                if (!item.titulo || item.titulo.trim() === '') return false;
                
                // 1. Verificar se está realmente na fase 7.2 Perdido
                const estaNaFasePerdido = item.fase_perdido && 
                                         item.fase_perdido.trim() !== '' && 
                                         (item.fase_perdido.includes("7.2") || 
                                          item.fase_perdido.toLowerCase().includes("perdido"));
                
                if (!estaNaFasePerdido) return false;
                
                // 2. Deve ter motivo da perda preenchido
                if (!item.concat_motivo_perda || item.concat_motivo_perda.trim() === '') return false;
                
                // 3. Aplicar a regra do campo auxiliar e verificar se começa com "Descarte"
                const campoAuxiliar = getCampoAuxiliar(item.concat_motivo_perda);
                const comecaComDescarte = campoAuxiliar.startsWith("Descarte");
                
                console.log("🔍 Processando lead para descarte:", {
                    titulo: item.titulo,
                    motivo_original: item.concat_motivo_perda,
                    campo_auxiliar: campoAuxiliar,
                    comeca_com_descarte: comecaComDescarte
                });
                
                if (comecaComDescarte) {
                    console.log("✅ Lead válido para tabela de descartes");
                    return true; // INCLUIR apenas os que começam com "Descarte"
                }
                
                console.log("❌ Lead descartado (não é descarte)");
                return false;
            } catch (error) {
                console.error("Erro ao processar item:", item, error);
                return false;
            }
        });

        // Se não há leads válidos, mostrar mensagem
        if (leadsComDescarte.length === 0) {
            console.log("⚠️ Nenhum lead com descarte encontrado");
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #adb5bd; padding: 20px;">Nenhum descarte encontrado no período selecionado</td></tr>';
            console.log("=== FIM updateDescartesTable ===");
            return;
        }

        // Contar motivos de descarte usando o campo auxiliar processado
        const motivoContador = {};
        let totalLeadsDescartados = 0;

        leadsComDescarte.forEach(item => {
            try {
                const campoAuxiliar = getCampoAuxiliar(item.concat_motivo_perda);
                const motivoFinal = campoAuxiliar || item.concat_motivo_perda.trim();
                
                if (motivoFinal) {
                    if (!motivoContador[motivoFinal]) {
                        motivoContador[motivoFinal] = 0;
                    }
                    motivoContador[motivoFinal]++;
                    totalLeadsDescartados++;
                }
            } catch (error) {
                console.error("Erro ao contar motivo de descarte:", item, error);
            }
        });

        console.log("📈 Contagem de descartes:", motivoContador);
        console.log("📊 Total de leads descartados contabilizados:", totalLeadsDescartados);

        // Converter para array e ordenar por quantidade (descendente)
        const dadosTabela = Object.keys(motivoContador).map(motivo => ({
            motivo,
            total: motivoContador[motivo],
            percentual: totalLeadsDescartados > 0 ? ((motivoContador[motivo] / totalLeadsDescartados) * 100).toFixed(1) : 0
        })).sort((a, b) => b.total - a.total);

        // Limpar tabela
        tbody.innerHTML = '';

        // Adicionar linhas de dados
        dadosTabela.forEach(item => {
            try {
                const tr = document.createElement('tr');
                
                // Determinar classe do mapa de calor baseada na porcentagem
                let heatClass = 'heat-low';
                const percentualNumerico = parseFloat(item.percentual);
                if (percentualNumerico >= 30) {
                    heatClass = 'heat-high';
                } else if (percentualNumerico >= 15) {
                    heatClass = 'heat-medium';
                }
                
                tr.innerHTML = `
                    <td>${item.motivo}</td>
                    <td class="${heatClass}">${item.percentual}%</td>
                    <td class="${heatClass}">${item.total}</td>
                `;
                
                tbody.appendChild(tr);
            } catch (error) {
                console.error("Erro ao criar linha da tabela de descartes:", item, error);
            }
        });

        // Adicionar linha de resumo/total
        const totalPercentual = dadosTabela.reduce((sum, item) => sum + parseFloat(item.percentual), 0);
        const totalAbsoluto = dadosTabela.reduce((sum, item) => sum + item.total, 0);
        
        const trTotal = document.createElement('tr');
        trTotal.className = 'leads-perdidos-table-footer';
        
        trTotal.innerHTML = `
            <td><strong>TOTAL GERAL</strong></td>
            <td><strong>${totalPercentual.toFixed(1)}%</strong></td>
            <td><strong>${totalAbsoluto}</strong></td>
        `;
        
        tbody.appendChild(trTotal);

        console.log("✅ Tabela de descartes atualizada com", dadosTabela.length, "motivos + linha de resumo");
        
    } catch (error) {
        console.error("❌ Erro geral na função updateDescartesTable:", error);
    }
    
    console.log("=== FIM updateDescartesTable ===");
}

// Função para atualizar a tabela de concorrentes (motivo "Fechou com o Concorrente")
function updateConcorrentesTable(dadosFiltrados) {
    console.log("=== INÍCIO updateConcorrentesTable ===");
    
    try {
        const tbody = document.getElementById('concorrentes-table-body');
        if (!tbody) {
            console.error("❌ Elemento concorrentes-table-body não encontrado");
            return;
        }

        console.log("📊 Processando", dadosFiltrados.length, "registros para tabela de concorrentes");

        // Filtrar apenas leads que fecharam com concorrente
        const leadsComConcorrente = dadosFiltrados.filter(item => {
            try {
                if (!item.titulo || item.titulo.trim() === '') return false;
                
                // 1. Verificar se está realmente na fase 7.2 Perdido
                const estaNaFasePerdido = item.fase_perdido && 
                                         item.fase_perdido.trim() !== '' && 
                                         (item.fase_perdido.includes("7.2") || 
                                          item.fase_perdido.toLowerCase().includes("perdido"));
                
                if (!estaNaFasePerdido) return false;
                
                // 2. Deve ter motivo da perda igual a "Fechou com o Concorrente"
                if (!item.concat_motivo_perda || item.concat_motivo_perda.trim() === '') return false;
                
                const motivo = item.concat_motivo_perda.trim();
                const fechouComConcorrente = motivo === "Fechou com o Concorrente";
                
                console.log("🔍 Processando lead para concorrente:", {
                    titulo: item.titulo,
                    motivo: item.concat_motivo_perda,
                    concorrente: item.concat_concorrente,
                    fechou_com_concorrente: fechouComConcorrente
                });
                
                if (fechouComConcorrente) {
                    console.log("✅ Lead válido para tabela de concorrentes");
                    return true;
                }
                
                console.log("❌ Lead descartado (não fechou com concorrente)");
                return false;
            } catch (error) {
                console.error("Erro ao processar item:", item, error);
                return false;
            }
        });

        // Se não há leads válidos, mostrar mensagem
        if (leadsComConcorrente.length === 0) {
            console.log("⚠️ Nenhum lead que fechou com concorrente encontrado");
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #adb5bd; padding: 20px;">Nenhum concorrente encontrado no período selecionado</td></tr>';
            console.log("=== FIM updateConcorrentesTable ===");
            return;
        }

        // Contar concorrentes
        const concorrenteContador = {};
        let totalLeadsConcorrente = 0;

        leadsComConcorrente.forEach(item => {
            try {
                // Usar o campo concat_concorrente
                let concorrente = item.concat_concorrente || 'Concorrente não informado (Turma ativa por não informar)';
                concorrente = concorrente.trim();
                
                if (concorrente === '') {
                    concorrente = 'Concorrente não informado (Turma ativa por não informar)';
                }
                
                if (!concorrenteContador[concorrente]) {
                    concorrenteContador[concorrente] = 0;
                }
                concorrenteContador[concorrente]++;
                totalLeadsConcorrente++;
            } catch (error) {
                console.error("Erro ao contar concorrente:", item, error);
            }
        });

        console.log("📈 Contagem de concorrentes:", concorrenteContador);
        console.log("📊 Total de leads com concorrente contabilizados:", totalLeadsConcorrente);

        // Converter para array e ordenar por quantidade (descendente)
        const dadosTabela = Object.keys(concorrenteContador).map(concorrente => ({
            concorrente,
            total: concorrenteContador[concorrente],
            percentual: totalLeadsConcorrente > 0 ? ((concorrenteContador[concorrente] / totalLeadsConcorrente) * 100).toFixed(1) : 0
        })).sort((a, b) => b.total - a.total);

        // Limpar tabela
        tbody.innerHTML = '';

        // Adicionar linhas de dados
        dadosTabela.forEach(item => {
            try {
                const tr = document.createElement('tr');
                
                // Determinar classe do mapa de calor baseada na porcentagem
                let heatClass = 'heat-low';
                const percentualNumerico = parseFloat(item.percentual);
                if (percentualNumerico >= 30) {
                    heatClass = 'heat-high';
                } else if (percentualNumerico >= 15) {
                    heatClass = 'heat-medium';
                }
                
                tr.innerHTML = `
                    <td>${item.concorrente}</td>
                    <td class="${heatClass}">${item.percentual}%</td>
                    <td class="${heatClass}">${item.total}</td>
                `;
                
                tbody.appendChild(tr);
            } catch (error) {
                console.error("Erro ao criar linha da tabela de concorrentes:", item, error);
            }
        });

        // Adicionar linha de resumo/total
        const totalPercentual = dadosTabela.reduce((sum, item) => sum + parseFloat(item.percentual), 0);
        const totalAbsoluto = dadosTabela.reduce((sum, item) => sum + item.total, 0);
        
        const trTotal = document.createElement('tr');
        trTotal.className = 'leads-perdidos-table-footer';
        
        trTotal.innerHTML = `
            <td><strong>TOTAL GERAL</strong></td>
            <td><strong>${totalPercentual.toFixed(1)}%</strong></td>
            <td><strong>${totalAbsoluto}</strong></td>
        `;
        
        tbody.appendChild(trTotal);

        console.log("✅ Tabela de concorrentes atualizada com", dadosTabela.length, "concorrentes + linha de resumo");
        
    } catch (error) {
        console.error("❌ Erro geral na função updateConcorrentesTable:", error);
    }
    
    console.log("=== FIM updateConcorrentesTable ===");
}

// === NOVA SEÇÃO: NEGOCIAÇÕES E PERDAS POR FASE ===

let negociacoesPorFaseChartInstance = null;

// Função para criar o gráfico de negociações por fase
function createNegociacoesPorFaseChart(dadosFiltrados) {
    console.log("=== INÍCIO createNegociacoesPorFaseChart ===");
    
    // Contar quantidade de cards por fase atual
    const faseContador = {};
    
    dadosFiltrados.forEach(item => {
        if (item.titulo && item.titulo.trim() !== '') { // Apenas cards com título válido
            const fase = item.fase_perdido || 'Não informado';
            faseContador[fase] = (faseContador[fase] || 0) + 1;
        }
    });
    
    console.log("📊 Contador por fase:", faseContador);
    
    // Preparar dados para o gráfico (sem ordenação - a ordenação será feita na função do gráfico)
    const dadosGrafico = Object.keys(faseContador).map(fase => ({
        fase: fase,
        quantidade: faseContador[fase]
    }));
    
    // Atualizar gráfico
    updateNegociacoesPorFaseChart(dadosGrafico);
    
    console.log("=== FIM createNegociacoesPorFaseChart ===");
}

// Função para atualizar o gráfico de negociações por fase
function updateNegociacoesPorFaseChart(dados) {
    const ctx = document.getElementById('negociacoesPorFaseChart');
    if (!ctx) {
        console.error("❌ Elemento 'negociacoesPorFaseChart' não encontrado");
        return;
    }
    
    // Destruir gráfico anterior se existir
    if (negociacoesPorFaseChartInstance) {
        negociacoesPorFaseChartInstance.destroy();
    }
    
    // Definir a ordem correta das fases e suas cores conforme gradiente laranja da empresa
    const ordemFases = [
        { nome: '1.1 Qualificação do Lead', cor: '#FFE082' },        // Laranja muito claro
        { nome: '1.2 Qualificação Comissão', cor: '#FFCC02' },      // Laranja claro
        { nome: '1.3 Reunião Agendada', cor: '#FFC107' },           // Laranja médio-claro
        { nome: '2.1 Diagnóstico Realizado', cor: '#FF9800' },      // Laranja médio
        { nome: '2.2 Apresentação Proposta', cor: '#F57C00' },      // Laranja médio-escuro
        { nome: '3.1 Proposta Enviada', cor: '#EF6C00' },           // Laranja escuro
        { nome: '3.2 Apresentação Turma', cor: '#E65100' },         // Laranja muito escuro
        { nome: '3.3 Gerar Contrato', cor: '#D84315' },             // Laranja quase vermelho
        { nome: '4.1 Fechamento Comissão', cor: '#BF360C' },        // Laranja bem escuro
        { nome: '4.1.1 Indicação', cor: '#A6300C' },                // Laranja escuríssimo
        { nome: '5.1 Captação de Adesões', cor: '#942A09' },        // Laranja quase marrom
        { nome: '6.2 Novo Cliente Concluído', cor: '#8A2A0B' },     // Laranja final
        { nome: '7.2 Perdido', cor: '#D32F2F' }                     // Vermelho para perdidos
    ];
    
    // Criar um mapa dos dados recebidos
    const dadosMap = new Map();
    dados.forEach(item => {
        dadosMap.set(item.fase, item.quantidade);
    });
    
    // Organizar dados na ordem correta das fases - INCLUINDO ZEROS
    const labels = [];
    const valores = [];
    const backgroundColor = [];
    
    ordemFases.forEach(fase => {
        labels.push(fase.nome);
        // Se a fase tem dados, usar o valor; senão, usar 0
        valores.push(dadosMap.has(fase.nome) ? dadosMap.get(fase.nome) : 0);
        backgroundColor.push(fase.cor);
    });
    
    // Adicionar fases que não estão na lista padrão (se houver)
    dados.forEach(item => {
        if (!ordemFases.some(fase => fase.nome === item.fase)) {
            labels.push(item.fase);
            valores.push(item.quantidade);
            backgroundColor.push('#FF8F00'); // Cor laranja padrão para fases não mapeadas
        }
    });
    
    negociacoesPorFaseChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quantidade',
                data: valores,
                backgroundColor: backgroundColor,
                borderColor: backgroundColor,
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // Isso torna o gráfico horizontal
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 20,
                    bottom: 20,
                    left: 20,
                    right: 80 // Mais espaço à direita para os valores
                }
            },
            plugins: {
                legend: {
                    display: false // Não mostrar legenda
                },
                tooltip: {
                    titleFont: {
                        size: 16 // Aumentar fonte do título do tooltip
                    },
                    bodyFont: {
                        size: 14 // Aumentar fonte do corpo do tooltip
                    },
                    footerFont: {
                        size: 12 // Fonte do rodapé do tooltip
                    }
                },
                datalabels: {
                    anchor: 'end',
                    align: 'right',
                    color: '#FFFFFF',
                    font: {
                        size: 14,
                        weight: 'bold'
                    },
                    formatter: (value) => value.toString()
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        color: '#FFFFFF',
                        font: {
                            size: 16 // Aumentado de 12 para 16
                        },
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    ticks: {
                        color: '#FFFFFF',
                        font: {
                            size: 14 // Aumentado de 11 para 14
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
    
    console.log("✅ Gráfico de negociações por fase atualizado com", dados.length, "fases");
}

// === GRÁFICO DE PERDAS POR FASE ===

let perdasPorFaseChartInstance = null;

// Função para criar o gráfico de perdas por fase
function createPerdasPorFaseChart(dadosFiltrados) {
    console.log("=== INÍCIO createPerdasPorFaseChart ===");
    
    // Contar perdas por fase baseado nas colunas específicas
    const perdasContador = {
        '1.1 Qualificação do Lead': 0,
        '1.2 Qualificação Comissão': 0,
        '1.3 Reunião Agendada': 0,
        '2.1 Diagnóstico Realizado': 0,
        '2.2 Apresentação Proposta': 0,
        '3.1 Proposta Enviada': 0,
        '3.2 Apresentação Turma': 0,
        '3.3 Gerar Contrato': 0,
        '4.1 Fechamento Comissão': 0,
        '5.1 Captação de Adesões': 0
    };
    
    dadosFiltrados.forEach(item => {
        if (item.titulo && item.titulo.trim() !== '') { // Apenas cards com título válido
            // Contar "sim" em cada coluna de perda
            if (item.perda_11 && item.perda_11.toLowerCase() === 'sim') perdasContador['1.1 Qualificação do Lead']++;
            if (item.perda_12 && item.perda_12.toLowerCase() === 'sim') perdasContador['1.2 Qualificação Comissão']++;
            if (item.perda_13 && item.perda_13.toLowerCase() === 'sim') perdasContador['1.3 Reunião Agendada']++;
            if (item.perda_21 && item.perda_21.toLowerCase() === 'sim') perdasContador['2.1 Diagnóstico Realizado']++;
            if (item.perda_22 && item.perda_22.toLowerCase() === 'sim') perdasContador['2.2 Apresentação Proposta']++;
            if (item.perda_31 && item.perda_31.toLowerCase() === 'sim') perdasContador['3.1 Proposta Enviada']++;
            if (item.perda_32 && item.perda_32.toLowerCase() === 'sim') perdasContador['3.2 Apresentação Turma']++;
            if (item.perda_33 && item.perda_33.toLowerCase() === 'sim') perdasContador['3.3 Gerar Contrato']++;
            if (item.perda_41 && item.perda_41.toLowerCase() === 'sim') perdasContador['4.1 Fechamento Comissão']++;
            if (item.perda_51 && item.perda_51.toLowerCase() === 'sim') perdasContador['5.1 Captação de Adesões']++;
        }
    });
    
    console.log("📊 Contador de perdas por fase:", perdasContador);
    
    // Preparar dados para o gráfico (SEMPRE exibir todas as fases, mesmo com zero)
    const dadosGrafico = Object.keys(perdasContador).map(fase => ({
        fase: fase,
        quantidade: perdasContador[fase]
    }));
    
    // Atualizar gráfico
    updatePerdasPorFaseChart(dadosGrafico);
    
    console.log("=== FIM createPerdasPorFaseChart ===");
}

// Função para atualizar o gráfico de perdas por fase
function updatePerdasPorFaseChart(dados) {
    const ctx = document.getElementById('perdasPorFaseChart');
    if (!ctx) {
        console.error("❌ Elemento 'perdasPorFaseChart' não encontrado");
        return;
    }
    
    // Destruir gráfico anterior se existir
    if (perdasPorFaseChartInstance) {
        perdasPorFaseChartInstance.destroy();
    }
    
    // Definir cores em tons de vermelho para perdas
    const ordemFasesPerdas = [
        { nome: '1.1 Qualificação do Lead', cor: '#FFCDD2' },        // Vermelho muito claro
        { nome: '1.2 Qualificação Comissão', cor: '#EF9A9A' },      // Vermelho claro
        { nome: '1.3 Reunião Agendada', cor: '#E57373' },           // Vermelho médio-claro
        { nome: '2.1 Diagnóstico Realizado', cor: '#EF5350' },      // Vermelho médio
        { nome: '2.2 Apresentação Proposta', cor: '#F44336' },      // Vermelho médio-escuro
        { nome: '3.1 Proposta Enviada', cor: '#E53935' },           // Vermelho escuro
        { nome: '3.2 Apresentação Turma', cor: '#D32F2F' },         // Vermelho muito escuro
        { nome: '3.3 Gerar Contrato', cor: '#C62828' },             // Vermelho quase marrom
        { nome: '4.1 Fechamento Comissão', cor: '#B71C1C' },        // Vermelho bem escuro
        { nome: '5.1 Captação de Adesões', cor: '#8D1F1F' }         // Vermelho escuríssimo
    ];
    
    // Criar um mapa dos dados recebidos
    const dadosMap = new Map();
    dados.forEach(item => {
        dadosMap.set(item.fase, item.quantidade);
    });
    
    // Organizar dados na ordem correta das fases - INCLUINDO ZEROS
    const labels = [];
    const valores = [];
    const backgroundColor = [];
    
    ordemFasesPerdas.forEach(fase => {
        labels.push(fase.nome);
        // Se a fase tem dados, usar o valor; senão, usar 0
        valores.push(dadosMap.has(fase.nome) ? dadosMap.get(fase.nome) : 0);
        backgroundColor.push(fase.cor);
    });
    
    perdasPorFaseChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Perdas',
                data: valores,
                backgroundColor: backgroundColor,
                borderColor: backgroundColor,
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // Gráfico horizontal
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 20,
                    bottom: 20,
                    left: 20,
                    right: 80
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    titleFont: {
                        size: 16 // Aumentar fonte do título do tooltip
                    },
                    bodyFont: {
                        size: 14 // Aumentar fonte do corpo do tooltip
                    },
                    footerFont: {
                        size: 12 // Fonte do rodapé do tooltip
                    }
                },
                datalabels: {
                    anchor: 'end',
                    align: 'right',
                    color: '#FFFFFF',
                    font: {
                        size: 14,
                        weight: 'bold'
                    },
                    formatter: (value) => value.toString()
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        color: '#FFFFFF',
                        font: {
                            size: 16 // Aumentado de 12 para 16
                        },
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    ticks: {
                        color: '#FFFFFF',
                        font: {
                            size: 14 // Aumentado de 11 para 14
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
    
    console.log("✅ Gráfico de perdas por fase atualizado com", dados.length, "fases");
}