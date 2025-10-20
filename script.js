
// --- CONFIGURAÇÃO PADRÃO REUTILIZÁVEL PARA OS FILTROS MULTISELECT ---
const multiselectDefaultConfig = {
    enableFiltering: true,
    includeSelectAllOption: true,
    selectAllText: "Marcar todos",
    filterPlaceholder: "Pesquisar...",
    buttonWidth: "100%",
    maxHeight: 300,
    enableCaseInsensitiveFiltering: true,
    filterBehavior: 'text'
};

// --- FUNÇÃO AUXILIAR PARA AJUSTAR CORES ---
// Recebe uma cor em hexadecimal (ex: '#FFC107') e um percentual.
// Percentual > 0 clareia, percentual < 0 escurece.
function adjustColor(hex, percent) {
    let r = parseInt(hex.substring(1, 3), 16);
    let g = parseInt(hex.substring(3, 5), 16);
    let b = parseInt(hex.substring(5, 7), 16);

    r = parseInt(r * (100 + percent) / 100);
    g = parseInt(g * (100 + percent) / 100);
    b = parseInt(b * (100 + percent) / 100);

    r = (r < 255) ? r : 255;  
    g = (g < 255) ? g : 255;  
    b = (b < 255) ? b : 255;  

    const RR = ((r.toString(16).length === 1) ? "0" + r.toString(16) : r.toString(16));
    const GG = ((g.toString(16).length === 1) ? "0" + g.toString(16) : g.toString(16));
    const BB = ((b.toString(16).length === 1) ? "0" + b.toString(16) : b.toString(16));

    return "#" + RR + GG + BB;
}
// ...existing code...

// --- CONFIGURAÇÕES GLOBAIS ---
const SALES_SPREADSHEET_ID = "1HXyq_r2ssJ5c7wXdrBUc-WdqrlCfiZYE1EuIWbIDg0U";

// Variável global para o flatpickr
let dateRangePicker;

// Variável global para preservar a seleção do filtro rápido de unidades
let lastQuickFilterSelection = null;

// --- FUNÇÕES PARA FILTRO RÁPIDO DE UNIDADES ---
function filterSingleUnit(unitName) {
    const unidadeFilter = $("#unidade-filter");
    
    // Salva a seleção na variável global para preservar entre mudanças de página
    lastQuickFilterSelection = [unitName];
    console.log('💾 Salvando seleção do filtro rápido:', lastQuickFilterSelection);
    
    // Desmarca todas as opções
    unidadeFilter.multiselect('deselectAll', false);
    
    // Seleciona apenas a unidade específica
    unidadeFilter.multiselect('select', unitName);
    
    // Fecha o painel de acesso rápido
    closeUnidadeQuickPanel();
    
    // Atualiza o dashboard imediatamente
    updateDashboard();
}



// Armazena todas as unidades para filtrar
let allUnidades = [];

function createUnidadeQuickList(unidades) {
    // Armazena todas as unidades globalmente
    allUnidades = [...unidades];
    
    // Renderiza a lista inicial
    renderUnidadeList(unidades);
    
    // Configura a pesquisa
    setupUnidadeSearch();
}

function renderUnidadeList(unidades) {
    const listContainer = document.getElementById('unidade-quick-list');
    if (!listContainer) return;
    
    // Limpa a lista
    listContainer.innerHTML = '';
    
    if (unidades.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'unidade-no-results';
        noResults.textContent = 'Nenhuma unidade encontrada';
        listContainer.appendChild(noResults);
        return;
    }
    
    // Cria item para cada unidade
    unidades.forEach(unidade => {
        const wrapper = document.createElement('div');
        wrapper.className = 'unidade-item-wrapper';
        
        const name = document.createElement('span');
        name.className = 'unidade-quick-name';
        name.textContent = unidade;
        name.title = unidade; // Tooltip com nome completo
        
        const btn = document.createElement('button');
        btn.className = 'unidade-quick-filter-btn';
        btn.textContent = 'Somente';
        btn.onclick = () => filterSingleUnit(unidade);
        
        wrapper.appendChild(name);
        wrapper.appendChild(btn);
        listContainer.appendChild(wrapper);
    });
}

function setupUnidadeSearch() {
    const searchInput = document.getElementById('unidade-search');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            // Se não há termo de busca, mostra todas
            renderUnidadeList(allUnidades);
        } else {
            // Filtra unidades que contenham o termo
            const filteredUnidades = allUnidades.filter(unidade => 
                unidade.toLowerCase().includes(searchTerm)
            );
            renderUnidadeList(filteredUnidades);
        }
    });
    
    // Limpa a pesquisa quando o painel é fechado
    searchInput.addEventListener('blur', function() {
        setTimeout(() => {
            if (!document.getElementById('unidade-quick-panel')?.classList.contains('active')) {
                searchInput.value = '';
                renderUnidadeList(allUnidades);
            }
        }, 200);
    });
}

// Inicializa os eventos do painel de acesso rápido
function initUnidadeQuickAccess() {
    // Aguarda um pouco para garantir que os elementos estejam carregados
    setTimeout(() => {
        const quickBtn = document.getElementById('unidade-quick-access-btn');
        const panel = document.getElementById('unidade-quick-panel');
        
        if (quickBtn) {
            quickBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                // IMPORTANTE: NÃO fazer nada que possa afetar o layout da sidebar
                const isActive = panel && panel.classList.contains('active');
                if (isActive) {
                    closeUnidadeQuickPanel();
                } else {
                    openUnidadeQuickPanel();
                }
            });
        }
        
        // Event listener global para fechar ao clicar fora (igual aos outros filtros)
        document.addEventListener('click', function(event) {
            if (panel && panel.classList.contains('active')) {
                const isClickInside = panel.contains(event.target) || 
                                    quickBtn?.contains(event.target);
                
                if (!isClickInside) {
                    closeUnidadeQuickPanel();
                }
            }
        });
    }, 500);
}

// Funções separadas para abrir e fechar - mais controle
function openUnidadeQuickPanel() {
    // Fechar o filtro normal de unidades se estiver aberto
    try {
        console.log('🔍 Verificando se filtro normal está aberto...');
        
        // Múltiplas estratégias para detectar e fechar o multiselect
        const unidadeFilterContainer = document.querySelector('.filter-item-unidades');
        console.log('Container encontrado:', !!unidadeFilterContainer);
        
        if (unidadeFilterContainer) {
            // Estratégia 1: Procurar por dropdown visível
            let dropdownFound = false;
            const allDropdowns = unidadeFilterContainer.querySelectorAll('.multiselect-container');
            console.log('Dropdowns encontrados:', allDropdowns.length);
            
            allDropdowns.forEach((dropdown, index) => {
                console.log(`Dropdown ${index}:`, {
                    classes: dropdown.className,
                    display: dropdown.style.display,
                    visible: dropdown.offsetHeight > 0
                });
                
                if (dropdown.offsetHeight > 0 || dropdown.style.display === 'block' || dropdown.classList.contains('open')) {
                    dropdownFound = true;
                    console.log('🎯 Dropdown aberto encontrado!');
                }
            });
            
            // Estratégia 2: Verificar se há elementos com aria-expanded="true"
            const expandedElements = unidadeFilterContainer.querySelectorAll('[aria-expanded="true"]');
            console.log('Elementos expandidos:', expandedElements.length);
            
            if (dropdownFound || expandedElements.length > 0) {
                console.log('🔄 Tentando fechar filtro normal...');
                
                // Tentar método jQuery primeiro
                const normalUnidadeFilter = $("#unidade-filter");
                if (normalUnidadeFilter.length > 0) {
                    try {
                        // Simular clique no botão do multiselect para fechar
                        const multiselectButton = unidadeFilterContainer.querySelector('.multiselect.dropdown-toggle');
                        if (multiselectButton) {
                            multiselectButton.click();
                            console.log('✅ Filtro normal fechado via clique no botão');
                        } else {
                            // Fallback: forçar fechamento
                            allDropdowns.forEach(dropdown => {
                                dropdown.style.display = 'none';
                                dropdown.classList.remove('open');
                            });
                            expandedElements.forEach(el => el.setAttribute('aria-expanded', 'false'));
                            console.log('✅ Filtro normal fechado via DOM direto');
                        }
                    } catch (error) {
                        console.log('❌ Erro no fechamento:', error);
                    }
                }
            } else {
                console.log('ℹ️ Nenhum filtro normal aberto detectado');
            }
        }
    } catch (error) {
        console.log('❌ Erro geral:', error);
    }
    
    const panel = document.getElementById('unidade-quick-panel');
    if (panel && !panel.classList.contains('active')) {
        panel.classList.add('active');
        console.log('✅ Filtro rápido aberto');
    }
}

function closeUnidadeQuickPanel() {
    const panel = document.getElementById('unidade-quick-panel');
    if (panel && panel.classList.contains('active')) {
        panel.classList.remove('active');
        
        // Limpa a pesquisa quando fecha o painel
        const searchInput = document.getElementById('unidade-search');
        if (searchInput) {
            searchInput.value = '';
            renderUnidadeList(allUnidades);
        }
    }
}

// Configuração do seletor de datas
document.addEventListener('DOMContentLoaded', function() {
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0); // último dia do mês atual
    
    // Inicializar painel de acesso rápido de unidades
    initUnidadeQuickAccess();
    
    // Inicializar flatpickr
    dateRangePicker = flatpickr("#date-range", {
        mode: "range",
        dateFormat: "d/m/Y",
        defaultDate: [primeiroDiaMes, ultimoDiaMes],
        locale: "pt",
        theme: "dark",
        showMonths: 2,
        rangeSeparator: " até ",
        disableMobile: true,
        onChange: function(selectedDates) {
            if (selectedDates.length === 2) {
                document.getElementById('start-date').value = selectedDates[0].toISOString().split('T')[0];
                document.getElementById('end-date').value = selectedDates[1].toISOString().split('T')[0];
                
                // Verificar se o período selecionado corresponde a alguma opção pré-definida
                const matchingOption = findMatchingPeriodOption(selectedDates[0], selectedDates[1]);
                
                // Atualizar estado das opções
                document.querySelectorAll('.period-option').forEach(opt => opt.classList.remove('active'));
                if (matchingOption) {
                    matchingOption.classList.add('active');
                }
                
                // Dispara o evento de mudança para atualizar os dados
                document.getElementById('start-date').dispatchEvent(new Event('change'));
            }
        }
    });

    // Configurar botões de período pré-definido
    setupPeriodShortcuts();
    
    // Marcar "Este mês" como ativo por padrão (corresponde ao período inicial)
    setTimeout(() => {
        const esteMesOption = document.querySelector('.period-option[data-period="estemes"]');
        if (esteMesOption) {
            esteMesOption.classList.add('active');
        }
    }, 100);
});

// Função para configurar os botões de período pré-definido
function setupPeriodShortcuts() {
    const dropdownBtn = document.getElementById('period-dropdown-btn');
    const dropdown = document.getElementById('period-dropdown');
    const periodOptions = document.querySelectorAll('.period-option');
    
    // Toggle dropdown ao clicar no botão
    dropdownBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });
    
    // Fechar dropdown ao clicar fora
    document.addEventListener('click', function(e) {
        if (!dropdown.contains(e.target) && !dropdownBtn.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
    
    // Configurar opções de período
    periodOptions.forEach(option => {
        option.addEventListener('click', function() {
            const period = this.getAttribute('data-period');
            const dates = getPredefinedPeriod(period);
            
            if (dates) {
                // Atualizar o flatpickr
                dateRangePicker.setDate([dates.start, dates.end]);
                
                // Atualizar campos hidden
                document.getElementById('start-date').value = dates.start.toISOString().split('T')[0];
                document.getElementById('end-date').value = dates.end.toISOString().split('T')[0];
                
                // Marcar opção como ativa
                periodOptions.forEach(opt => opt.classList.remove('active'));
                this.classList.add('active');
                
                // Fechar dropdown
                dropdown.classList.remove('show');
                
                // Disparar evento para atualizar dados
                document.getElementById('start-date').dispatchEvent(new Event('change'));
            }
        });
    });
}

// Função para calcular datas dos períodos pré-definidos
function getPredefinedPeriod(period) {
    const hoje = new Date();
    const year = hoje.getFullYear();
    const month = hoje.getMonth();
    const day = hoje.getDate();
    
    switch(period) {
        case 'hoje':
            return {
                start: new Date(year, month, day),
                end: new Date(year, month, day)
            };
            
        case 'ontem':
            const ontem = new Date(hoje);
            ontem.setDate(day - 1);
            return {
                start: ontem,
                end: new Date(ontem)
            };
            
        case 'ultimos7dias':
            const sete_dias_atras = new Date(hoje);
            sete_dias_atras.setDate(day - 6); // -6 porque inclui hoje
            return {
                start: sete_dias_atras,
                end: hoje
            };
            
        case 'ultimos30dias':
            const trinta_dias_atras = new Date(hoje);
            trinta_dias_atras.setDate(day - 29); // -29 porque inclui hoje
            return {
                start: trinta_dias_atras,
                end: hoje
            };
            
        case 'estemes':
            return {
                start: new Date(year, month, 1),
                end: new Date(year, month + 1, 0) // último dia do mês atual
            };
            
        case 'mespassado':
            return {
                start: new Date(year, month - 1, 1),
                end: new Date(year, month, 0) // último dia do mês anterior
            };
            
        case 'esteano':
            return {
                start: new Date(year, 0, 1), // 1º de janeiro
                end: new Date(year, 11, 31) // 31 de dezembro
            };
            
        case 'esteanoateagora':
            return {
                start: new Date(year, 0, 1), // 1º de janeiro
                end: new Date() // data atual
            };
            
        case 'anopassado':
            return {
                start: new Date(year - 1, 0, 1), // 1º de janeiro do ano anterior
                end: new Date(year - 1, 11, 31) // 31 de dezembro do ano anterior
            };
            
        default:
            return null;
    }
}

// Função para encontrar se um período selecionado corresponde a alguma opção pré-definida
function findMatchingPeriodOption(startDate, endDate) {
    const options = document.querySelectorAll('.period-option');
    
    for (let option of options) {
        const period = option.getAttribute('data-period');
        const predefinedDates = getPredefinedPeriod(period);
        
        if (predefinedDates) {
            // Comparar datas (normalizar para início do dia)
            const start1 = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            const end1 = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
            const start2 = new Date(predefinedDates.start.getFullYear(), predefinedDates.start.getMonth(), predefinedDates.start.getDate());
            const end2 = new Date(predefinedDates.end.getFullYear(), predefinedDates.end.getMonth(), predefinedDates.end.getDate());
            
            if (start1.getTime() === start2.getTime() && end1.getTime() === end2.getTime()) {
                return option;
            }
        }
    }
    
    return null;
}

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

// Padronizar legenda: usar mesmo tamanho/família dos gráficos da primeira página
if (Chart && Chart.defaults && Chart.defaults.plugins) {
    Chart.defaults.plugins.legend = Chart.defaults.plugins.legend || {};
    Chart.defaults.plugins.legend.labels = Chart.defaults.plugins.legend.labels || {};
    Chart.defaults.plugins.legend.labels.font = { size: 18, family: 'Poppins, Arial, sans-serif', weight: 'bold' };
    Chart.defaults.plugins.legend.labels.color = '#FFFFFF';
}

// Global Chart.js axis/font defaults to match dashboard style
if (Chart && Chart.defaults) {
    // Default font family for charts
    Chart.defaults.font.family = 'Poppins, Arial, sans-serif';
    // Slightly larger axis tick labels and matching color
    Chart.defaults.font.size = 16; // base font size for chart text (match other charts)
    Chart.defaults.color = '#F8F9FA';

    // Configure default scale (applies to linear/category axes)
    Chart.defaults.scales = Chart.defaults.scales || {};
    const defaultScale = {
        ticks: {
            color: '#adb5bd',
            font: {
                family: 'Poppins, Arial, sans-serif',
                size: 16,
                weight: '500'
            }
        },
        grid: {
            color: 'rgba(255,255,255,0.06)'
        }
    };
    // Apply to common scale types
    Chart.defaults.scales.linear = Chart.defaults.scales.linear || defaultScale;
    Chart.defaults.scales.category = Chart.defaults.scales.category || defaultScale;
    Chart.defaults.scales.time = Chart.defaults.scales.time || defaultScale;
}

// --- REMOVIDO: O mapeamento de códigos de acesso fixo foi retirado daqui ---

let userAccessLevel = null;
let accessDataFromSheet = new Map(); // NOVO: Armazenará os códigos da planilha

// ========== CONTROLE DE META INTERNA/FRANQUIA ==========
let isMetaInterna = false; // Flag para meta interna (85%) vs meta franquia (100%)
const META_INTERNA_MULTIPLICADOR = 0.85; // 85% da meta original

// ========== FUNÇÕES AUXILIARES PARA META INTERNA/FRANQUIA ==========
function atualizarIndicadoresTitulos(tipoMeta) {
    // Atualizar todos os indicadores de meta nos títulos
    const indicadores = [
        'kpi-meta-indicator-1',
        'kpi-meta-indicator-2', 
        'table-meta-indicator'
    ];
    
    indicadores.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = tipoMeta;
        }
    });
}

function aplicarMultiplicadorMeta(valorMeta) {
    return isMetaInterna ? valorMeta * META_INTERNA_MULTIPLICADOR : valorMeta;
}

function alternarTipoMeta(ativarMetaInterna) {
    const checkbox = document.getElementById('meta-toggle-checkbox');
    const labelLeft = document.querySelector('.meta-toggle-label-left');
    const labelRight = document.querySelector('.meta-toggle-label-right');
    const currentText = document.getElementById('meta-current-text');
    const descriptionText = document.getElementById('meta-description-text');
    
    if (ativarMetaInterna) {
        isMetaInterna = true;
        
        // Atualizar toggle switch
        checkbox.checked = true;
        
        // Atualizar labels
        labelLeft.classList.remove('active');
        labelRight.classList.add('active');
        
        // Atualizar textos informativos
        currentText.textContent = '🎯 Meta Interna (85%)';
        descriptionText.textContent = 'Meta ajustada para controle interno da empresa com 85% dos valores originais';
        
        // Atualizar indicadores nos títulos
        atualizarIndicadoresTitulos('(Meta Interna)');
        
        console.log('✅ Meta INTERNA ativada (85%)');
    } else {
        isMetaInterna = false;
        
        // Atualizar toggle switch
        checkbox.checked = false;
        
        // Atualizar labels
        labelLeft.classList.add('active');
        labelRight.classList.remove('active');
        
        // Atualizar textos informativos
        currentText.textContent = '🚀 Super Meta (100%)';
        descriptionText.textContent = 'Metas originais das bases de dados para controle das franquias';
        
        // Atualizar indicadores nos títulos
        atualizarIndicadoresTitulos('(Super Meta)');
        
        console.log('✅ SUPER META ativada (100%)');
    }
    
    // Recalcular e atualizar os KPIs
    updateDashboard();
}

function inicializarControlesMeta() {
    console.log('🎯 Inicializando controles de meta...');
    
    // Mostrar a seção de controle de meta
    const metaToggleSection = document.getElementById('meta-toggle-section');
    if (metaToggleSection) {
        metaToggleSection.style.display = 'block';
    }
    
    // Adicionar evento ao toggle switch
    const checkbox = document.getElementById('meta-toggle-checkbox');
    if (checkbox) {
        checkbox.addEventListener('change', function() {
            alternarTipoMeta(this.checked);
        });
        
        console.log('✅ Event listener adicionado ao toggle switch');
    }
    
    // Inicializar no estado padrão (Super Meta)
    alternarTipoMeta(false);
    
    console.log('✅ Controles de meta inicializados');
}

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

/* --- Runtime safeguard: aplicar inline styles nas legendas geradas para garantir cor branca --- */
function enforceLegendInlineColors() {
    const selectors = [
        '.chart-legend', '.chart-legend *',
        '.chartjs-legend', '.chartjs-legend *',
        '#captacoesChart + .chartjs-legend',
    ];
    const applyToExisting = () => {
        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                try {
                    el.style.setProperty('color', '#F8F9FA', 'important');
                    el.style.setProperty('fill', '#F8F9FA', 'important');
                    el.style.setProperty('stroke', '#F8F9FA', 'important');
                    // ensure children also get inline color
                    el.querySelectorAll('*').forEach(child => {
                        child.style.setProperty('color', '#F8F9FA', 'important');
                        child.style.setProperty('fill', '#F8F9FA', 'important');
                    });
                } catch (e) { /* ignore DOM timing errors */ }
            });
        });
    };

    // Apply once on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyToExisting);
    } else {
        applyToExisting();
    }

    // Observe for dynamically injected legends (Chart.js can generate them after charts are created)
    const observer = new MutationObserver((mutations) => {
        let needsApply = false;
        for (const m of mutations) {
            if (m.addedNodes && m.addedNodes.length) {
                needsApply = true; break;
            }
        }
        if (needsApply) applyToExisting();
    });

    const main = document.getElementById('main-content') || document.body;
    observer.observe(main, { childList: true, subtree: true });
}

// Start the enforcement immediately
enforceLegendInlineColors();
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
                if (accessLevel === '1'|| accessLevel === '22')  {
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

// End of script.js - ensure all blocks are closed


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
    "concorrentes-table-section",
    "indicadores-operacionais",
        "detalhada-adesoes-table-section", "fundos-detalhados-table-section",
        "funil-indicators-section", "funil-captacoes-section",
      ].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = "block";
      });
      document.getElementById("filters-section").style.display = "flex";

      // ✅ GARANTIR POPULAÇÃO DOS FILTROS: Usar retry para garantir que dados estão prontos
      // CORREÇÃO: Preservar seleção do filtro rápido ou seleção atual
      const currentUnidadesSelection = $("#unidade-filter").val() || [];
      const unidadesToPreserve = lastQuickFilterSelection || currentUnidadesSelection;
      console.log('💾 Preservando seleção de unidades (inicialização):', unidadesToPreserve);
      console.log('   - Filtro rápido ativo:', !!lastQuickFilterSelection);
      retryPopulateFilters(unidadesToPreserve);
      
      // 🆕 Aplicar visibilidade dos filtros específicos por página
      setTimeout(() => {
        applyFundosFilterVisibility();
        applyTipoAdesaoFilterVisibility();
        applyTipoServicoFilterVisibility();
        applyTipoClienteFilterVisibility();
        applyConsultorComercialFilterVisibility();
        applyIndicacaoAdesaoFilterVisibility();
        applyInstituicaoFilterVisibility();
      }, 500);
      
      // 🎯 Inicializar controles de meta franquia/interna
      inicializarControlesMeta();
      
      addEventListeners();
      updateDashboard();
    } else {
      loader.innerHTML = "Nenhum dado de vendas encontrado ou falha ao carregar.";
      
      // 🎯 Mesmo sem dados, inicializar controles de meta para visualização
      inicializarControlesMeta();
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
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error("Erro ao buscar dados de vendas da planilha:", await response.json());
            return [];
        }
        const data = await response.json();
        const rows = data.values || [];
        if (rows.length < 2) return [];

        const headers = rows[0].map((h) => String(h).trim().toLowerCase());
        const unidadeIndex = headers.indexOf("nm_unidade");
        const dataIndex = headers.indexOf("dt_cadastro_integrante");
        const valorIndex = headers.indexOf("vl_plano");

        if (unidadeIndex === -1 || dataIndex === -1 || valorIndex === -1) {
            console.error("Colunas essenciais (nm_unidade, dt_cadastro_integrante, vl_plano) não foram encontradas.");
            return [];
        }

        const tipoVendaIndex = headers.indexOf("venda_posvenda");
        const indicadoPorIndex = headers.indexOf("indicado_por");
        const consultorComercialIndex = headers.indexOf("consultor_comercial");
        const codigoIntegranteIndex = headers.indexOf("codigo_integrante");
        const nomeIntegranteIndex = headers.indexOf("nm_integrante");
        const idFundoIndex = headers.indexOf("id_fundo");
        const fundoIndex = headers.indexOf("nm_fundo");
        const cursoFundoIndex = headers.indexOf("curso_fundo");
        const tipoServicoIndex = headers.indexOf("tp_servico");
        const instituicaoIndex = headers.indexOf("nm_instituicao");
        const tipoClienteIndex = headers.indexOf("tipo_cliente");

        // local date parser: accepts DD/MM/YYYY or ISO-like strings
        const localParseDate = (dateString) => {
            if (!dateString) return null;
            if (typeof dateString !== 'string') return new Date(dateString);
            const parts = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            if (parts) return new Date(parts[3], parts[2] - 1, parts[1]);
            const d = new Date(dateString);
            return isNaN(d) ? null : d;
        };

        return rows.slice(1).map((row) => {
            const dateValue = localParseDate(row[dataIndex]);
            if (!dateValue) return null;
            return {
                nm_unidade: row[unidadeIndex] || "N/A",
                dt_cadastro_integrante: dateValue,
                vl_plano: parseFloat(String(row[valorIndex] || "0").replace(",", ".")) || 0,
                venda_posvenda: tipoVendaIndex !== -1 ? row[tipoVendaIndex] || "VENDA" : "N/A",
                indicado_por: indicadoPorIndex !== -1 ? row[indicadoPorIndex] || "N/A" : "N/A",
                consultor_comercial: consultorComercialIndex !== -1 ? row[consultorComercialIndex] || "N/A" : "N/A",
                codigo_integrante: codigoIntegranteIndex !== -1 ? row[codigoIntegranteIndex] || "N/A" : "N/A",
                nm_integrante: nomeIntegranteIndex !== -1 ? row[nomeIntegranteIndex] || "N/A" : "N/A",
                id_fundo: idFundoIndex !== -1 ? row[idFundoIndex] || "N/A" : "N/A",
                nm_fundo: fundoIndex !== -1 ? row[fundoIndex] || "N/A" : "N/A",
                curso_fundo: cursoFundoIndex !== -1 ? row[cursoFundoIndex] || "" : "",
                tp_servico: tipoServicoIndex !== -1 ? row[tipoServicoIndex] || "N/A" : "N/A",
                nm_instituicao: instituicaoIndex !== -1 ? row[instituicaoIndex] || "N/A" : "N/A",
                tipo_cliente: tipoClienteIndex !== -1 ? row[tipoClienteIndex] || "N/A" : "N/A",
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
  if (!METAS_SPREADSHEET_ID || !METAS_SHEET_NAME || !API_KEY) {
    console.error("Configurações da planilha de metas incompletas.");
    return new Map();
  }
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${METAS_SPREADSHEET_ID}/values/${METAS_SHEET_NAME}!A:Z?key=${API_KEY}`;
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

        // Tentar detectar coluna de meta_leads (coluna I conforme informado)
        let metaLeadsIndex = headers.indexOf("meta_leads");
        if (metaLeadsIndex === -1) metaLeadsIndex = headers.indexOf("meta leads");
        if (metaLeadsIndex === -1) metaLeadsIndex = 8; // fallback para coluna I (índice 8)

        console.log('🔍 Índice meta_leads detectado em:', metaLeadsIndex);
    // Detectar coluna meta_contratos (coluna K conforme informado)
    let metaContratosIndex = headers.indexOf("meta_contratos");
    if (metaContratosIndex === -1) metaContratosIndex = headers.indexOf("meta contratos");
    if (metaContratosIndex === -1) metaContratosIndex = 10; // fallback para coluna K (índice 10)
    console.log('🔍 Índice meta_contratos detectado em:', metaContratosIndex);
    // Detectar coluna meta_reunioes (coluna J conforme informado)
    let metaReunioesIndex = headers.indexOf("meta_reunioes");
    if (metaReunioesIndex === -1) metaReunioesIndex = headers.indexOf("meta reunioes");
    if (metaReunioesIndex === -1) metaReunioesIndex = 9; // fallback para coluna J (índice 9)
    console.log('🔍 Índice meta_reunioes detectado em:', metaReunioesIndex);

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
                        const metaLeads = parseInt(row[metaLeadsIndex]) || 0;
                        const metaContratos = parseInt(row[metaContratosIndex]) || 0;
                        const metaReunioes = parseInt(row[metaReunioesIndex]) || 0;
                        metasMap.set(chave, {
                            meta_vvr_vendas: metaVendas,
                            meta_vvr_posvendas: metaPosvendas,
                            meta_vvr_total: metaVendas + metaPosvendas,
                            meta_adesoes: metaAdesoes,
                            meta_leads: metaLeads,
                            meta_contratos: metaContratos,
                            meta_reunioes: metaReunioes,
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

function processAndCrossReferenceData(salesData, startDate, endDate, selectedUnidades = []) {
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
            
            // Verificar se está no período E se a unidade está no filtro
            const noPeriodo = metaDate >= startDate && metaDate < endDate;
            const unidadePermitida = selectedUnidades.length === 0 || selectedUnidades.includes(unidade);
            
            if (noPeriodo && unidadePermitida) {
              console.log(`✅ Adicionando unidade só com meta: ${unidade} - ${periodo}`);
              vendasPorMesUnidade[chaveMeta] = {
                unidade: unidade,
                periodo: periodo,
                realizado_vvr: 0,
                realizado_adesoes: 0,
              };
            } else {
              console.log(`❌ Meta excluída - Período: ${noPeriodo}, Filtro: ${unidadePermitida} - ${unidade} - ${periodo}`);
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
    console.log('� updateMainKPIs INICIADA - dados recebidos:', dataBruta.length, 'registros');
    console.log('  - selectedUnidades:', selectedUnidades);
    console.log('  - selectedUnidades length:', selectedUnidades.length);
    console.log('  - userAccessLevel:', userAccessLevel);
    console.log('  - startDate:', startDate);
    console.log('  - endDate:', endDate);
    console.log('  - retryCount:', retryCount);
    
    // ✅ CORREÇÃO: Sempre calcular KPIs, mesmo sem metas (metas ficam zeradas)
    if (!metasData) {
        console.warn('⚠️ Metas não disponíveis - KPIs serão calculados apenas com valores realizados');
    }
    
    // 🚨 DEBUG ESPECÍFICO PARA KPIs COM DATAS FUTURAS - MOVIDO PARA CIMA
    const today = new Date();
    const isSelectingFutureOnly = startDate >= today;
    const dadosPassadoKPI = dataBruta.filter(d => d.dt_cadastro_integrante < today);
    const dadosFuturoKPI = dataBruta.filter(d => d.dt_cadastro_integrante >= today);
    
    console.log('🚨 TESTE KPIs COM DATAS FUTURAS:');
    console.log('  📅 Período:', startDate.toISOString().split('T')[0], 'até', endDate.toISOString().split('T')[0]);
    console.log('  📅 Só futuro?', isSelectingFutureOnly);
    console.log('  📊 Total dados para KPI:', dataBruta.length);
    console.log('  📊 Dados passado/presente:', dadosPassadoKPI.length);
    console.log('  📊 Dados futuro:', dadosFuturoKPI.length);
    
    if (dadosFuturoKPI.length > 0) {
        console.log('  💰 Valores futuros para KPI:');
        dadosFuturoKPI.slice(0, 3).forEach((d, i) => {
            console.log(`    [${i}] ${d.dt_cadastro_integrante.toISOString().split('T')[0]} - R$${d.vl_plano} - ${d.venda_posvenda}`);
        });
    }
    
    const getColorForPercentage = (percent) => {
        // Use subtle left-to-right gradients for each state
        if (percent >= 1) return "linear-gradient(90deg, #51c46a 0%, #28a745 100%)"; // green gradient
        if (percent >= 0.5) return "linear-gradient(90deg, #ff8a33 0%, #FF6600 50%, #e65500 100%)"; // brand orange gradient
        return "linear-gradient(90deg, #ff6b6b 0%, #dc3545 100%)"; // red gradient
    };
    // Solid color counterpart (used for percent text) - no gradients
    const getSolidColorForPercentage = (percent) => {
        if (percent >= 1) return "#28a745"; // green
        if (percent >= 0.5) return "#FF6600"; // brand orange
        return "#dc3545"; // red
    };
    const normalizeText = (text) => text?.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // 🔍 DEBUG CRÍTICO: Verificar dados recebidos
    console.log('🔍 DEBUG DADOS KPI:');
    console.log('  - dataBruta.length:', dataBruta.length);
    console.log('  - startDate:', startDate);  
    console.log('  - endDate:', endDate);
    
    if (dataBruta.length > 0) {
        console.log('  - Primeira data exemplo:', dataBruta[0].dt_cadastro_integrante);
        console.log('  - Últimas 3 datas:', dataBruta.slice(-3).map(d => d.dt_cadastro_integrante));
        
        // Verificar quantos registros estão no período de outubro/2025
        const outubr2025 = dataBruta.filter(d => {
            const data = d.dt_cadastro_integrante;
            return data.getFullYear() === 2025 && data.getMonth() === 9; // Outubro = mês 9
        });
        console.log('  - Registros de outubro/2025:', outubr2025.length);
        
        if (outubr2025.length > 0) {
            console.log('  - Valores outubro/2025:', outubr2025.map(d => ({data: d.dt_cadastro_integrante, valor: d.vl_plano})));
        }
    }

    const realizadoVendas = dataBruta.filter((d) => normalizeText(d.venda_posvenda) === "VENDA").reduce((sum, d) => sum + d.vl_plano, 0);
    const realizadoPosVendas = dataBruta.filter((d) => normalizeText(d.venda_posvenda) === "POS VENDA").reduce((sum, d) => sum + d.vl_plano, 0);
    const realizadoTotal = realizadoVendas + realizadoPosVendas;
    
    console.log('� RESULTADO KPIs:');
    console.log('  - realizadoVendas:', realizadoVendas);
    console.log('  - realizadoPosVendas:', realizadoPosVendas);
    console.log('  - realizadoTotal:', realizadoTotal);

    let metaVendas = 0;
    let metaPosVendas = 0;
    
    // --- TRAVA DE SEGURANÇA DEFINITIVA DENTRO DA FUNÇÃO ---
    // Só calcula a meta se o usuário for admin OU se for um franqueado com unidades selecionadas.
    const canCalculateMeta = (userAccessLevel === 'ALL_UNITS' || selectedUnidades.length > 0);
    console.log('🔍 canCalculateMeta:', canCalculateMeta);

    if (canCalculateMeta && metasData && metasData.size > 0) {
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
        
        // 🔧 APLICAR LÓGICA EXATA DOS INDICADORES OPERACIONAIS QUE FUNCIONA
        const unidadesSelecionadasNorm = unitsToConsider.map(u => u ? u.toString().toLowerCase().trim() : '');
        metasData.forEach((metaInfo, chave) => {
            const [unidadeMetaRaw, anoMeta, mesMeta] = chave.split("-");
            const unidadeMeta = unidadeMetaRaw ? unidadeMetaRaw.toString().toLowerCase().trim() : '';
            if (!unidadeMeta) return;
            if (unidadesSelecionadasNorm.length > 0 && !unidadesSelecionadasNorm.includes(unidadeMeta)) return;
            if (anoMeta && mesMeta) {
                const metaDate = new Date(Number(anoMeta), Number(mesMeta) - 1, 1);
                const metaRangeStart = new Date(metaDate.getFullYear(), metaDate.getMonth(), 1, 0, 0, 0, 0);
                const metaRangeEnd = new Date(metaDate.getFullYear(), metaDate.getMonth() + 1, 0, 23, 59, 59, 999); // último dia do mês às 23:59:59
                if (metaRangeStart <= endDate && metaRangeEnd >= startDate) {
                    metaVendas += (metaInfo.meta_vvr_vendas || 0);
                    metaPosVendas += (metaInfo.meta_vvr_posvendas || 0);
                    metasEncontradas++;
                    console.log(`✅ Meta encontrada: ${unidadeMetaRaw}-${anoMeta}-${mesMeta} = ${(metaInfo.meta_vvr_vendas || 0) + (metaInfo.meta_vvr_posvendas || 0)}`);
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

    // ========== APLICAR MULTIPLICADOR DE META INTERNA ==========
    const metaVendasOriginal = metaVendas;
    const metaPosVendasOriginal = metaPosVendas;
    
    // Aplicar multiplicador se meta interna estiver ativa
    metaVendas = aplicarMultiplicadorMeta(metaVendas);
    metaPosVendas = aplicarMultiplicadorMeta(metaPosVendas);
    
    const metaTotal = metaVendas + metaPosVendas;
    
    console.log('🎯 CONTROLE DE METAS:');
    console.log('  - Tipo de meta:', isMetaInterna ? 'INTERNA (85%)' : 'FRANQUIA (100%)');
    console.log('  - Meta Vendas (original):', formatCurrency(metaVendasOriginal));
    console.log('  - Meta Vendas (aplicada):', formatCurrency(metaVendas));
    console.log('  - Meta Pós-Vendas (original):', formatCurrency(metaPosVendasOriginal));
    console.log('  - Meta Pós-Vendas (aplicada):', formatCurrency(metaPosVendas));
    console.log('  - Meta Total (aplicada):', formatCurrency(metaTotal));
    
    const percentTotal = metaTotal > 0 ? realizadoTotal / metaTotal : 0;
    const percentVendas = metaVendas > 0 ? realizadoVendas / metaVendas : 0;
    const percentPosVendas = metaPosVendas > 0 ? realizadoPosVendas / metaPosVendas : 0;

    const totalColor = getColorForPercentage(percentTotal);
    document.getElementById("kpi-total-realizado").textContent = formatCurrency(realizadoTotal);
    document.getElementById("kpi-total-meta").textContent = formatCurrency(metaTotal);
    const totalPercentEl = document.getElementById("kpi-total-percent");
    totalPercentEl.textContent = formatPercent(percentTotal);
    totalPercentEl.style.color = getSolidColorForPercentage(percentTotal);
    document.getElementById("kpi-total-progress").style.background = totalColor;
    document.getElementById("kpi-total-progress").style.width = `${Math.min(percentTotal * 100, 100)}%`;

    const vendasColor = getColorForPercentage(percentVendas);
    document.getElementById("kpi-vendas-realizado").textContent = formatCurrency(realizadoVendas);
    document.getElementById("kpi-vendas-meta").textContent = formatCurrency(metaVendas);
    const vendasPercentEl = document.getElementById("kpi-vendas-percent");
    vendasPercentEl.textContent = formatPercent(percentVendas);
    vendasPercentEl.style.color = getSolidColorForPercentage(percentVendas);
    document.getElementById("kpi-vendas-progress").style.background = vendasColor;
    document.getElementById("kpi-vendas-progress").style.width = `${Math.min(percentVendas * 100, 100)}%`;

    const posVendasColor = getColorForPercentage(percentPosVendas);
    document.getElementById("kpi-posvendas-realizado").textContent = formatCurrency(realizadoPosVendas);
    document.getElementById("kpi-posvendas-meta").textContent = formatCurrency(metaPosVendas);
    const posVendasPercentEl = document.getElementById("kpi-posvendas-percent");
    posVendasPercentEl.textContent = formatPercent(percentPosVendas);
    posVendasPercentEl.style.color = getSolidColorForPercentage(percentPosVendas);
    document.getElementById("kpi-posvendas-progress").style.background = posVendasColor;
    document.getElementById("kpi-posvendas-progress").style.width = `${Math.min(percentPosVendas * 100, 100)}%`;
}

function updatePreviousYearKPIs(dataBruta, selectedUnidades, startDate, endDate) {
    const getColorForPercentage = (percent) => {
        if (percent >= 1) return "linear-gradient(90deg, #51c46a 0%, #28a745 100%)"; // green gradient
        if (percent >= 0.5) return "linear-gradient(90deg, #ff8a33 0%, #FF6600 50%, #e65500 100%)"; // brand orange gradient
        return "linear-gradient(90deg, #ff6b6b 0%, #dc3545 100%)"; // red gradient
    };
    // helper to return solid color (in case other parts expect a gradient vs solid)
    const getSolidColorForPercentage = (percent) => {
        if (percent >= 1) return "#28a745";
        if (percent >= 0.5) return "#FF6600";
        return "#dc3545";
    };
    const normalizeText = (text) => text?.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    const realizadoVendas = dataBruta.filter((d) => normalizeText(d.venda_posvenda) === "VENDA").reduce((sum, d) => sum + d.vl_plano, 0);
    const realizadoPosVendas = dataBruta.filter((d) => normalizeText(d.venda_posvenda) === "POS VENDA").reduce((sum, d) => sum + d.vl_plano, 0);
    const realizadoTotal = realizadoVendas + realizadoPosVendas;
    
    let metaVendas = 0;
    let metaPosVendas = 0;

    // ADICIONADO: datas do ano anterior
    const startDatePY = new Date(startDate.getFullYear() - 1, startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0);
    const endDatePY = new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
    // --- TRAVA DE SEGURANÇA DEFINITIVA DENTRO DA FUNÇÃO ---
    const canCalculateMeta = (userAccessLevel === 'ALL_UNITS' || selectedUnidades.length > 0);

    if (canCalculateMeta) {
        const unitsToConsider = (userAccessLevel === 'ALL_UNITS' && selectedUnidades.length === 0)
            ? [...new Set(allData.map(d => d.nm_unidade))]
            : selectedUnidades;
            
        // 🔧 APLICAR LÓGICA EXATA DOS INDICADORES OPERACIONAIS QUE FUNCIONA (ANO ANTERIOR)
        const unidadesSelecionadasNorm = unitsToConsider.map(u => u ? u.toString().toLowerCase().trim() : '');
        metasData.forEach((metaInfo, chave) => {
            const [unidadeMetaRaw, anoMeta, mesMeta] = chave.split("-");
            const unidadeMeta = unidadeMetaRaw ? unidadeMetaRaw.toString().toLowerCase().trim() : '';
            if (!unidadeMeta) return;
            if (unidadesSelecionadasNorm.length > 0 && !unidadesSelecionadasNorm.includes(unidadeMeta)) return;
            if (anoMeta && mesMeta) {
                const metaDate = new Date(Number(anoMeta), Number(mesMeta) - 1, 1);
                const metaRangeStart = new Date(metaDate.getFullYear(), metaDate.getMonth(), 1, 0, 0, 0, 0);
                const metaRangeEnd = new Date(metaDate.getFullYear(), metaDate.getMonth() + 1, 0, 23, 59, 59, 999); // último dia do mês às 23:59:59
                // Para ano anterior, compara com startDatePY e endDatePY
                if (metaRangeStart <= endDatePY && metaRangeEnd >= startDatePY) {
                    metaVendas += (metaInfo.meta_vvr_vendas || 0);
                    metaPosVendas += (metaInfo.meta_vvr_posvendas || 0);
                }
            }
        });
    }
    
    // ========== APLICAR MULTIPLICADOR DE META INTERNA (ANO ANTERIOR) ==========
    const metaVendasOriginal = metaVendas;
    const metaPosVendasOriginal = metaPosVendas;
    
    // Aplicar multiplicador se meta interna estiver ativa
    metaVendas = aplicarMultiplicadorMeta(metaVendas);
    metaPosVendas = aplicarMultiplicadorMeta(metaPosVendas);
    
    const metaTotal = metaVendas + metaPosVendas;
    
    console.log('🎯 CONTROLE DE METAS (ANO ANTERIOR):');
    console.log('  - Tipo de meta:', isMetaInterna ? 'INTERNA (85%)' : 'FRANQUIA (100%)');
    console.log('  - Meta Total (aplicada):', formatCurrency(metaTotal));
    
    const percentTotal = metaTotal > 0 ? realizadoTotal / metaTotal : 0;
    const percentVendas = metaVendas > 0 ? realizadoVendas / metaVendas : 0;
    const percentPosVendas = metaPosVendas > 0 ? realizadoPosVendas / metaPosVendas : 0;

    const totalColor = getColorForPercentage(percentTotal);
    document.getElementById("kpi-total-realizado-py").textContent = formatCurrency(realizadoTotal);
    document.getElementById("kpi-total-meta-py").textContent = formatCurrency(metaTotal);
    const totalPercentEl = document.getElementById("kpi-total-percent-py");
    totalPercentEl.textContent = formatPercent(percentTotal);
    totalPercentEl.style.color = getSolidColorForPercentage(percentTotal);
    document.getElementById("kpi-total-progress-py").style.background = totalColor;
    document.getElementById("kpi-total-progress-py").style.width = `${Math.min(percentTotal * 100, 100)}%`;

    const vendasColor = getColorForPercentage(percentVendas);
    document.getElementById("kpi-vendas-realizado-py").textContent = formatCurrency(realizadoVendas);
    document.getElementById("kpi-vendas-meta-py").textContent = formatCurrency(metaVendas);
    const vendasPercentEl = document.getElementById("kpi-vendas-percent-py");
    vendasPercentEl.textContent = formatPercent(percentVendas);
    vendasPercentEl.style.color = getSolidColorForPercentage(percentVendas);
    document.getElementById("kpi-vendas-progress-py").style.background = vendasColor;
    document.getElementById("kpi-vendas-progress-py").style.width = `${Math.min(percentVendas * 100, 100)}%`;

    const posVendasColor = getColorForPercentage(percentPosVendas);
    document.getElementById("kpi-posvendas-realizado-py").textContent = formatCurrency(realizadoPosVendas);
    document.getElementById("kpi-posvendas-meta-py").textContent = formatCurrency(metaPosVendas);
    const posVendasPercentEl = document.getElementById("kpi-posvendas-percent-py");
    posVendasPercentEl.textContent = formatPercent(percentPosVendas);
    posVendasPercentEl.style.color = getSolidColorForPercentage(percentPosVendas);
    document.getElementById("kpi-posvendas-progress-py").style.background = posVendasColor;
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
    let selectedTipoAdesao, selectedTipoServico, selectedTipoCliente, selectedConsultorComercial, selectedIndicacaoAdesao, selectedInstituicao, selectedFundosForFiltering;
    
    // 🔒 VERIFICAÇÃO ROBUSTA: SE NÃO ESTIVERMOS NA PÁGINA 2, FORÇAR FUNDOS VAZIO
    if (currentActivePage !== 'page2') {
        // 🛑 FORÇAR filtro de fundos como vazio nas páginas 1 e 3
        selectedFundosForFiltering = [];
        selectedTipoAdesao = [];
        selectedTipoServico = [];
        selectedTipoCliente = [];
        selectedConsultorComercial = [];
        selectedIndicacaoAdesao = [];
        selectedInstituicao = [];
        console.log('🔍 🛑 PÁGINAS 1/3 - FORÇANDO filtro de fundos VAZIO (ignorando valor:', selectedFundos, ')');
    } else {
        // ✅ PÁGINA 2: Aplicar filtro de fundos + filtros específicos
        selectedTipoAdesao = $("#tipo-adesao-filter").val() || [];
        selectedTipoServico = $("#tipo-servico-filter").val() || [];
        selectedTipoCliente = $("#tipo-cliente-filter").val() || [];
        selectedConsultorComercial = $("#consultor-comercial-filter").val() || [];
        selectedIndicacaoAdesao = $("#indicacao-adesao-filter").val() || [];
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
    const startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0); // 00:00:00.000
    
    const endDateString = document.getElementById("end-date").value;
    const [endYear, endMonth, endDay] = endDateString.split('-').map(Number);
    const endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999); // 23:59:59.999

    const anoVigenteParaGrafico = startDate.getFullYear();

        // --- Indicadores Operacionais: LEADS ---
        try {
            // funilData já foi carregado em initializeDashboard()
            const funilFiltered = (funilData || []).filter(item => {
                // item.criado_em pode ser string; tentar parse se necessário
                let criado = item.criado_em || (item.row_data && item.row_data[12]) || item.criado_em;
                let criadoDate = null;
                if (criado instanceof Date) criadoDate = criado;
                else if (typeof criado === 'string') {
                    const parts = criado.match(/(\d{2})\/(\d{2})\/(\d{4})/);
                    if (parts) criadoDate = new Date(parts[3], parts[2]-1, parts[1]);
                    else criadoDate = new Date(criado);
                }
                const dentroPeriodo = criadoDate && criadoDate >= startDate && criadoDate < endDate;
                const unidadeMatch = finalSelectedUnidades.length === 0 || finalSelectedUnidades.includes(item.nm_unidade);
                return dentroPeriodo && unidadeMatch && item.titulo && item.titulo.trim() !== '';
            });

            const totalLeads = funilFiltered.length;

            // Calcular meta de leads a partir de metasData: somar meta_leads para os períodos/unidades relevantes
            let totalMetaLeads = 0;
            if (metasData && metasData.size > 0) {
                // normalizar unidades selecionadas para comparação insensível a case
                const unidadesSelecionadasNorm = finalSelectedUnidades.map(u => u ? u.toString().toLowerCase().trim() : '');
                metasData.forEach((metaInfo, chave) => {
                    // chave tem formato 'Unidade-Ano-Mes' ou similar
                    const [unidadeMetaRaw, anoMeta, mesMeta] = chave.split("-");
                    const unidadeMeta = unidadeMetaRaw ? unidadeMetaRaw.toString().toLowerCase().trim() : '';
                    if (!unidadeMeta) return;
                    // verificar unidade (se houver seleção)
                    if (unidadesSelecionadasNorm.length > 0 && unidadesSelecionadasNorm[0] !== undefined && unidadesSelecionadasNorm.length > 0) {
                        if (!unidadesSelecionadasNorm.includes(unidadeMeta)) return;
                    }
                    // verificar se o meta pertence ao período selecionado (usar mês/ano)
                    if (anoMeta && mesMeta) {
                        const metaDate = new Date(Number(anoMeta), Number(mesMeta) - 1, 1);
                        // incluir meta se o mês/ano estiver dentro do intervalo selecionado
                        const metaRangeStart = new Date(metaDate.getFullYear(), metaDate.getMonth(), 1);
                        const metaRangeEnd = new Date(metaDate.getFullYear(), metaDate.getMonth() + 1, 1);
                        if (metaRangeStart < endDate && metaRangeEnd > startDate) {
                            totalMetaLeads += (metaInfo.meta_leads || 0);
                        }
                    }
                });
            }

            // Atualizar DOM
            const leadsEl = document.getElementById('ind-leads');
            const leadsMetaEl = document.getElementById('ind-leads-meta');
            const leadsPercentEl = document.getElementById('ind-leads-percent');
            const leadsProgressEl = document.getElementById('ind-leads-progress');

            if (leadsEl) leadsEl.textContent = totalLeads.toLocaleString('pt-BR');
            if (leadsMetaEl) leadsMetaEl.textContent = totalMetaLeads.toLocaleString('pt-BR');
            const percent = totalMetaLeads > 0 ? (totalLeads / totalMetaLeads) : 0;
            if (leadsPercentEl) {
                leadsPercentEl.textContent = `${(percent * 100).toFixed(1)}%`;
                leadsPercentEl.style.color = getSolidColorForPercentage(percent);
            }
            if (leadsProgressEl) {
                leadsProgressEl.style.width = `${Math.min(100, percent * 100)}%`;
                // Use background instead of backgroundColor to override the CSS linear-gradient
                leadsProgressEl.style.background = getColorForPercentage(percent);
            }
// Regra de cor igual VVR
function getColorForPercentage(percent) {
    if (percent >= 1) return "linear-gradient(90deg, #51c46a 0%, #28a745 100%)"; // green gradient
    if (percent >= 0.5) return "linear-gradient(90deg, #ff8a33 0%, #FF6600 50%, #e65500 100%)"; // brand orange gradient
    return "linear-gradient(90deg, #ff6b6b 0%, #dc3545 100%)"; // red gradient
}
// Solid-color helper for percent text (keeps numbers without gradient)
function getSolidColorForPercentage(percent) {
    if (percent >= 1) return "#28a745";
    if (percent >= 0.5) return "#FF6600";
    return "#dc3545";
}
        } catch (err) {
            console.error('Erro ao calcular indicadores de leads:', err);
        }

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
            
            const consultorComercialMatch = selectedConsultorComercial.length === 0 || 
                selectedConsultorComercial.some(selected => {
                    if (selected === "VAZIO") {
                        // Filtrar campos vazios/N/A
                        return !d.consultor_comercial || d.consultor_comercial === 'N/A' || d.consultor_comercial.trim() === '';
                    } else {
                        // Filtrar por valor específico
                        return d.consultor_comercial && selectedConsultorComercial.includes(d.consultor_comercial.trim().toUpperCase());
                    }
                });
            
            const indicacaoAdesaoMatch = selectedIndicacaoAdesao.length === 0 || 
                (d.indicado_por && selectedIndicacaoAdesao.includes(d.indicado_por.trim().toUpperCase()));
            
            const instituicaoMatch = selectedInstituicao.length === 0 || 
                (d.nm_instituicao && selectedInstituicao.includes(d.nm_instituicao.trim().toUpperCase()));
            
            return unidadeMatch && cursoMatch && fundoMatch && tipoAdesaoMatch && tipoServicoMatch && tipoClienteMatch && consultorComercialMatch && indicacaoAdesaoMatch && instituicaoMatch;
        };
        
        // Filtrar dados de adesões
        dataBrutaFiltrada = allData.filter(d => filterLogic(d) && d.dt_cadastro_integrante >= startDate && d.dt_cadastro_integrante < endDate);
        dataParaGraficoAnual = allData.filter(d => filterLogic(d) && d.dt_cadastro_integrante.getFullYear() === anoVigenteParaGrafico);
        allDataForOtherCharts = allData.filter(filterLogic);

        // � DEBUG ESPECÍFICO PARA DATAS FUTURAS
        const today = new Date();
        const isSelectingFutureOnly = startDate >= today;
        const dadosPassado = dataBrutaFiltrada.filter(d => d.dt_cadastro_integrante < today);
        const dadosFuturo = dataBrutaFiltrada.filter(d => d.dt_cadastro_integrante >= today);
        
        if (isSelectingFutureOnly || dadosFuturo.length > 0) {
            console.log('� TESTE DATAS FUTURAS:');
            console.log('  📅 Período selecionado:', startDate.toISOString().split('T')[0], 'até', endDate.toISOString().split('T')[0]);
            console.log('  📅 Só futuro?', isSelectingFutureOnly);
            console.log('  📊 Total dados filtrados:', dataBrutaFiltrada.length);
            console.log('  📊 Dados passado/presente:', dadosPassado.length);
            console.log('  📊 Dados futuro:', dadosFuturo.length);
            
            if (dadosFuturo.length > 0) {
                console.log('  💰 Valores futuros encontrados:');
                dadosFuturo.slice(0, 3).forEach((d, i) => {
                    console.log(`    [${i}] ${d.dt_cadastro_integrante.toISOString().split('T')[0]} - R$${d.vl_plano} - ${d.venda_posvenda} - ${d.nm_unidade}`);
                });
            }
        }

        // --- Indicadores Operacionais: ADESÃO TOTAL ---
        try {
            const adesoesValidas = dataBrutaFiltrada.filter(d => d.codigo_integrante && d.codigo_integrante.toString().trim() !== '');
            const totalAdesoes = adesoesValidas.length;

            // Somar metas de adesões (meta_adesoes) a partir de metasData para o período/unidades
            let totalMetaAdesoes = 0;
            if (metasData && metasData.size > 0) {
                const unidadesSelecionadasNorm = finalSelectedUnidades.map(u => u ? u.toString().toLowerCase().trim() : '');
                metasData.forEach((metaInfo, chave) => {
                    const [unidadeMetaRaw, anoMeta, mesMeta] = chave.split("-");
                    const unidadeMeta = unidadeMetaRaw ? unidadeMetaRaw.toString().toLowerCase().trim() : '';
                    if (!unidadeMeta) return;
                    if (unidadesSelecionadasNorm.length > 0 && !unidadesSelecionadasNorm.includes(unidadeMeta)) return;
                    if (anoMeta && mesMeta) {
                        const metaDate = new Date(Number(anoMeta), Number(mesMeta) - 1, 1);
                        const metaRangeStart = new Date(metaDate.getFullYear(), metaDate.getMonth(), 1);
                        const metaRangeEnd = new Date(metaDate.getFullYear(), metaDate.getMonth() + 1, 1);
                        if (metaRangeStart < endDate && metaRangeEnd > startDate) {
                            totalMetaAdesoes += (metaInfo.meta_adesoes || 0);
                        }
                    }
                });
            }

            // Atualizar DOM
            const adesaoEl = document.getElementById('ind-adesao');
            const adesaoMetaEl = document.getElementById('ind-adesao-meta');
            const adesaoPercentEl = document.getElementById('ind-adesao-percent');
            const adesaoProgressEl = document.getElementById('ind-adesao-progress');

            if (adesaoEl) adesaoEl.textContent = totalAdesoes.toLocaleString('pt-BR');
            if (adesaoMetaEl) adesaoMetaEl.textContent = totalMetaAdesoes.toLocaleString('pt-BR');
            const percentAd = totalMetaAdesoes > 0 ? (totalAdesoes / totalMetaAdesoes) : 0;
            if (adesaoPercentEl) {
                adesaoPercentEl.textContent = `${(percentAd * 100).toFixed(1)}%`;
                adesaoPercentEl.style.color = getSolidColorForPercentage(percentAd);
            }
            if (adesaoProgressEl) {
                adesaoProgressEl.style.width = `${Math.min(100, percentAd * 100)}%`;
                // Use background instead of backgroundColor to override the CSS linear-gradient
                adesaoProgressEl.style.background = getColorForPercentage(percentAd);
            }
        } catch (err) {
            console.error('Erro ao calcular indicador de adesão total:', err);
        }

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

        const sDPY = new Date(startDate.getFullYear() - 1, startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0);
        const eDPY = new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
        dataBrutaFiltradaPY = allData.filter(d => filterLogic(d) && d.dt_cadastro_integrante >= sDPY && d.dt_cadastro_integrante <= eDPY);
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
    // --- Indicadores Operacionais: CONTRATOS (MV) ---
    try {
        const contratosValidos = fundosDataFiltrado.filter(d => d.id_fundo && d.id_fundo.toString().trim() !== '');
        const totalContratos = contratosValidos.length;

        let totalMetaContratos = 0;
        if (metasData && metasData.size > 0) {
            const unidadesSelecionadasNorm = finalSelectedUnidades.map(u => u ? u.toString().toLowerCase().trim() : '');
            metasData.forEach((metaInfo, chave) => {
                const [unidadeMetaRaw, anoMeta, mesMeta] = chave.split("-");
                const unidadeMeta = unidadeMetaRaw ? unidadeMetaRaw.toString().toLowerCase().trim() : '';
                if (!unidadeMeta) return;
                if (unidadesSelecionadasNorm.length > 0 && !unidadesSelecionadasNorm.includes(unidadeMeta)) return;
                if (anoMeta && mesMeta) {
                    const metaDate = new Date(Number(anoMeta), Number(mesMeta) - 1, 1);
                    const metaRangeStart = new Date(metaDate.getFullYear(), metaDate.getMonth(), 1);
                    const metaRangeEnd = new Date(metaDate.getFullYear(), metaDate.getMonth() + 1, 1);
                    if (metaRangeStart < endDate && metaRangeEnd > startDate) {
                        totalMetaContratos += (metaInfo.meta_contratos || 0);
                    }
                }
            });
        }

        const contratosEl = document.getElementById('ind-contratos');
        const contratosMetaEl = document.getElementById('ind-contratos-meta');
        const contratosPercentEl = document.getElementById('ind-contratos-percent');
        const contratosProgressEl = document.getElementById('ind-contratos-progress');

        if (contratosEl) contratosEl.textContent = totalContratos.toLocaleString('pt-BR');
        if (contratosMetaEl) contratosMetaEl.textContent = totalMetaContratos.toLocaleString('pt-BR');
        const percentCt = totalMetaContratos > 0 ? (totalContratos / totalMetaContratos) : 0;
        if (contratosPercentEl) {
            contratosPercentEl.textContent = `${(percentCt * 100).toFixed(1)}%`;
            contratosPercentEl.style.color = getSolidColorForPercentage(percentCt);
        }
        if (contratosProgressEl) {
            contratosProgressEl.style.width = `${Math.min(100, percentCt * 100)}%`;
            // Use background instead of backgroundColor to override the CSS linear-gradient
            contratosProgressEl.style.background = getColorForPercentage(percentCt);
        }
    } catch (err) {
        console.error('Erro ao calcular indicador de contratos:', err);
    }
    // --- Indicadores Operacionais: REUNIÕES ---
    try {
        // Regra especial: usar BH (diagnostico_realizado) se presente, senão BJ (proposta_enviada)
        const reunioesCount = (funilData || []).reduce((acc, item) => {
            const unidadeMatch = finalSelectedUnidades.length === 0 || finalSelectedUnidades.includes(item.nm_unidade);
            if (!unidadeMatch) return acc;

            let dateStr = item.diagnostico_realizado && item.diagnostico_realizado.toString().trim() !== '' ? item.diagnostico_realizado :
                (item.proposta_enviada && item.proposta_enviada.toString().trim() !== '' ? item.proposta_enviada : null);
            if (!dateStr) return acc;

            // Tentar parsear formatos comuns (DD/MM/YYYY) e fallback para Date constructor
            let parsedDate = null;
            if (typeof dateStr === 'string') {
                const parts = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
                if (parts) parsedDate = new Date(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1]));
                else {
                    const dt = new Date(dateStr);
                    if (!isNaN(dt)) parsedDate = dt;
                }
            } else if (dateStr instanceof Date) {
                parsedDate = dateStr;
            }

            if (!parsedDate || isNaN(parsedDate.getTime())) return acc;
            // normaliza horário: considerar inclusivo no início e exclusivo no fim (como outros indicadores)
            if (parsedDate >= startDate && parsedDate < endDate) return acc + 1;
            return acc;
        }, 0);

        // Somar metas de reunioes (meta_reunioes) a partir de metasData para o período/unidades
        let totalMetaReunioes = 0;
        if (metasData && metasData.size > 0) {
            const unidadesSelecionadasNorm = finalSelectedUnidades.map(u => u ? u.toString().toLowerCase().trim() : '');
            metasData.forEach((metaInfo, chave) => {
                const [unidadeMetaRaw, anoMeta, mesMeta] = chave.split("-");
                const unidadeMeta = unidadeMetaRaw ? unidadeMetaRaw.toString().toLowerCase().trim() : '';
                if (!unidadeMeta) return;
                if (unidadesSelecionadasNorm.length > 0 && !unidadesSelecionadasNorm.includes(unidadeMeta)) return;
                if (anoMeta && mesMeta) {
                    const metaDate = new Date(Number(anoMeta), Number(mesMeta) - 1, 1);
                    const metaRangeStart = new Date(metaDate.getFullYear(), metaDate.getMonth(), 1);
                    const metaRangeEnd = new Date(metaDate.getFullYear(), metaDate.getMonth() + 1, 1);
                    if (metaRangeStart < endDate && metaRangeEnd > startDate) {
                        totalMetaReunioes += (metaInfo.meta_reunioes || 0);
                    }
                }
            });
        }

        // Atualizar DOM
        const reunioesEl = document.getElementById('ind-reunioes');
        const reunioesMetaEl = document.getElementById('ind-reunioes-meta');
        const reunioesPercentEl = document.getElementById('ind-reunioes-percent');
        const reunioesProgressEl = document.getElementById('ind-reunioes-progress');

        if (reunioesEl) reunioesEl.textContent = reunioesCount.toLocaleString('pt-BR');
        if (reunioesMetaEl) reunioesMetaEl.textContent = totalMetaReunioes.toLocaleString('pt-BR');
        const percentRe = totalMetaReunioes > 0 ? (reunioesCount / totalMetaReunioes) : 0;
        if (reunioesPercentEl) {
            reunioesPercentEl.textContent = `${(percentRe * 100).toFixed(1)}%`;
            reunioesPercentEl.style.color = getSolidColorForPercentage(percentRe);
        }
        if (reunioesProgressEl) {
            reunioesProgressEl.style.width = `${Math.min(100, percentRe * 100)}%`;
            // Use background instead of backgroundColor to override the CSS linear-gradient
            reunioesProgressEl.style.background = getColorForPercentage(percentRe);
        }
    } catch (err) {
        console.error('Erro ao calcular indicador de reunioes:', err);
    }
    updateFunilIndicators(startDate, endDate, finalSelectedUnidades);
    updateMainKPIs(dataBrutaFiltrada, finalSelectedUnidades, startDate, endDate);
    
    const dataAgregadaComVendas = processAndCrossReferenceData(dataBrutaFiltrada, startDate, endDate, finalSelectedUnidades);
    currentFilteredDataForTable = dataAgregadaComVendas; 
    updateDataTable(dataAgregadaComVendas);
    
    document.getElementById("kpi-section-py").style.display = "block";
    updatePreviousYearKPIs(dataBrutaFiltradaPY, finalSelectedUnidades, startDate, endDate);

    // Atualiza a tabela de indicadores operacionais
    try {
        updateIndicatorsTable(finalSelectedUnidades, startDate, endDate);
        document.getElementById('indicadores-table-section').style.display = 'block';
    } catch (err) {
        console.error('Erro ao atualizar tabela de indicadores:', err);
    }
}

// ...


function updateVvrVsMetaPorMesChart(salesDataForYear, anoVigente) {
    // --- 1. PREPARAÇÃO DOS DADOS (esta parte do código não muda) ---
    const indicadorMeta = isMetaInterna ? '(Meta Interna)' : '(Super Meta)';
    const titleElement = document.getElementById("vvr-vs-meta-title");
    titleElement.innerHTML = `VVR REALIZADO VS. META POR MÊS (${anoVigente}) <span class="meta-indicator-highlight">${indicadorMeta}</span>`;
    const allYearPeriodos = Array.from({ length: 12 }, (_, i) => `${anoVigente}-${String(i + 1).padStart(2, "0")}`);
    const chartDataMap = new Map();
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
    let realizadoValues, metaValues;
    if (currentVvrChartType === "vendas") {
        realizadoValues = allYearPeriodos.map((p) => chartDataMap.get(p).realizado_vendas);
        metaValues = allYearPeriodos.map((p) => aplicarMultiplicadorMeta(chartDataMap.get(p).meta_vendas));
    } else if (currentVvrChartType === "posvendas") {
        realizadoValues = allYearPeriodos.map((p) => chartDataMap.get(p).realizado_posvendas);
        metaValues = allYearPeriodos.map((p) => aplicarMultiplicadorMeta(chartDataMap.get(p).meta_posvendas));
    } else {
        realizadoValues = allYearPeriodos.map((p) => chartDataMap.get(p).realizado_vendas + chartDataMap.get(p).realizado_posvendas);
        metaValues = allYearPeriodos.map((p) => aplicarMultiplicadorMeta(chartDataMap.get(p).meta_total));
    }
    const formattedLabels = allYearPeriodos.map((periodo) => {
        const [year, month] = periodo.split("-");
        const date = new Date(year, month - 1);
        return date.toLocaleString("pt-BR", { month: "short" }).replace(".", "");
    });
    // --- FIM DA PREPARAÇÃO ---

    // --- 2. LÓGICA DE ATUALIZAÇÃO COM ANIMAÇÃO ---
    if (vvrVsMetaPorMesChart) {
        // Se o gráfico JÁ EXISTE, apenas atualizamos seus dados e chamamos .update()
        vvrVsMetaPorMesChart.data.labels = formattedLabels;
        vvrVsMetaPorMesChart.data.datasets[0].data = realizadoValues;
        vvrVsMetaPorMesChart.data.datasets[1].data = metaValues;
        vvrVsMetaPorMesChart.update(); // Esta é a chamada que ativa a animação
    } else {
        // Se o gráfico NÃO EXISTE (primeira carga da página), nós o criamos.
        Chart.register(ChartDataLabels);
        vvrVsMetaPorMesChart = new Chart(document.getElementById("vvrVsMetaPorMesChart"), {
            type: "bar",
            data: {
                labels: formattedLabels,
                datasets: [
                    {
                        label: "VVR Realizado",
                        data: realizadoValues,
                        backgroundColor: function(context) {
                            const chart = context.chart;
                            const {ctx, chartArea} = chart;
                            if (!chartArea) { return '#FF6600'; }
                            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                            gradient.addColorStop(0, '#ff8a33');
                            gradient.addColorStop(0.5, '#FF6600');
                            gradient.addColorStop(1, '#e65500');
                            return gradient;
                        },
                        order: 1
                    },
                    {
                        label: "Meta VVR",
                        data: metaValues,
                        type: "line",
                        borderColor: "#FFFFFF",
                        order: 0,
                        datalabels: {
                            display: true,
                            align: "bottom",
                            backgroundColor: "rgba(0, 0, 0, 0.6)",
                            borderRadius: 4,
                            color: "white",
                            font: { size: 15 },
                            padding: 4,
                            formatter: (value) => {
                                if (value >= 1000000) return `${(value / 1000000).toFixed(0)} mi`;
                                if (value >= 1000) return `${(value / 1000).toFixed(0)} k`;
                                return value;
                            },
                        },
                    },
                ],
            },
            options: {
                // ... (O restante das suas opções originais do gráfico)
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                plugins: {
                    datalabels: {
                        anchor: "end",
                        align: "end",
                        display: true,
                        backgroundColor: "rgba(52, 58, 64, 0.7)",
                        borderRadius: 4,
                        color: "white",
                        font: { weight: "bold", size: 14, family: 'Poppins, Arial, sans-serif' },
                        padding: 4,
                        formatter: (value) => {
                            if (value === null || value === undefined) return '';
                            if (value >= 1000000) return `${(value / 1000000).toFixed(1)} mi`;
                            if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                            return value.toFixed ? value.toFixed(0) : value;
                        }
                    },
                    tooltip: {
                        padding: 12,
                        usePointStyle: true,
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || "";
                                if (label) { label += ": "; }
                                if (context.parsed.y !== null) { label += formatCurrency(context.parsed.y); }
                                return label;
                            }
                        }
                    },
                    legend: {
                        labels: {
                            font: { size: 18 }
                        }
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            font: { size: 16 },
                            color: '#adb5bd',
                            callback: function(value) {
                                if (value >= 1000000) return (value / 1000000).toFixed(0) + ' mi';
                                if (value >= 1000) return (value / 1000).toFixed(0) + ' K';
                                return value;
                            }
                        }
                    },
                    x: {
                        ticks: { font: { size: 16 }, color: '#adb5bd' }
                    }
                },
            },
        });
    }
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
    
    // Generate a perceptual 3-stop palette: gray -> saturated yellow -> brand orange
    function hexToRgb(hex) {
        const m = hex.replace('#','');
        return [parseInt(m.substring(0,2),16), parseInt(m.substring(2,4),16), parseInt(m.substring(4,6),16)];
    }
    function rgbToHex(r,g,b){
        return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
    }
    function generateThreeStopScale(startHex, midHex, endHex, steps){
        if (steps <= 1) return [endHex];
        const start = hexToRgb(startHex);
        const mid = hexToRgb(midHex);
        const end = hexToRgb(endHex);
        const out = [];
        for(let i=0;i<steps;i++){
            const t = i/(steps-1);
            if (t <= 0.5) {
                const localT = t / 0.5;
                const r = Math.round(start[0] + (mid[0]-start[0]) * localT);
                const g = Math.round(start[1] + (mid[1]-start[1]) * localT);
                const b = Math.round(start[2] + (mid[2]-start[2]) * localT);
                out.push(rgbToHex(r,g,b));
            } else {
                const localT = (t-0.5) / 0.5;
                const r = Math.round(mid[0] + (end[0]-mid[0]) * localT);
                const g = Math.round(mid[1] + (end[1]-mid[1]) * localT);
                const b = Math.round(mid[2] + (end[2]-mid[2]) * localT);
                out.push(rgbToHex(r,g,b));
            }
        }
        return out;
    }

    const baseGray = '#6c757d';
    const midYellow = '#FFB300';
    const baseOrange = '#FF6600';
    const palette = generateThreeStopScale(baseGray, midYellow, baseOrange, uniqueYears.length || 1);

    const datasets = uniqueYears.map((year, index) => {
        const monthlyData = salesByYearMonth[year] || Array(12).fill(0);
        const cumulativeData = monthlyData.reduce((acc, val) => [...acc, (acc.length > 0 ? acc[acc.length - 1] : 0) + val], []);
        return {
            label: year,
            data: cumulativeData,
            borderColor: palette[index % palette.length],
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
                // ✅ ADIÇÃO: Bloco 'legend' para customizar os ícones
                legend: {
                    labels: {
                        usePointStyle: true,
                        generateLabels: function(chart) {
                            const originalLabels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                            originalLabels.forEach(label => {
                                label.pointStyle = 'rect';
                                label.fillStyle = label.strokeStyle;
                                label.text = label.text.toUpperCase();
                            });
                            return originalLabels;
                        },
                        font: { size: 18 }
                    }
                },
                tooltip: {
                    padding: 12,
                    usePointStyle: true,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    borderRadius: 6,
                    bodyFont: {
                        size: 18,
                        family: 'Poppins, Arial, sans-serif',
                        weight: 'bold'
                    },
                    titleFont: {
                        size: 16,
                        family: 'Poppins, Arial, sans-serif',
                        weight: 'bold'
                    },
                    footerFont: {
                        size: 16,
                        family: 'Poppins, Arial, sans-serif',
                        weight: 'bold'
                    },
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
                // Legend: keep same style as the VVR vs Meta chart but increase font size
                legend: {
                    labels: {
                        font: { size: 18 }
                    }
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        // Show axis labels rounded in millions (mi)
                        callback: function(value) {
                            const num = Number(value);
                            if (Math.abs(num) >= 1000000) return Math.round(num / 1000000) + ' mi';
                            if (Math.abs(num) >= 1000) return Math.round(num / 1000) + 'k';
                            return num;
                        },
                        font: { size: 16 },
                        color: '#adb5bd'
                    },
                    grid: { color: 'rgba(255,255,255,0.04)' }
                },
                x: {
                    ticks: { font: { size: 16 }, color: '#adb5bd' }
                }
            },
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

    // Gera a paleta cinza -> amarelo saturado -> laranja (reutiliza a mesma lógica do chart de adesões)
    function hexToRgb(hex) {
        const m = hex.replace('#','');
        return [parseInt(m.substring(0,2),16), parseInt(m.substring(2,4),16), parseInt(m.substring(4,6),16)];
    }
    function rgbToHex(r,g,b){
        return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
    }
    function generateThreeStopScale(startHex, midHex, endHex, steps){
        if (steps <= 1) return [endHex];
        const start = hexToRgb(startHex);
        const mid = hexToRgb(midHex);
        const end = hexToRgb(endHex);
        const out = [];
        for(let i=0;i<steps;i++){
            const t = i/(steps-1);
            if (t <= 0.5) {
                const localT = t / 0.5;
                const r = Math.round(start[0] + (mid[0]-start[0]) * localT);
                const g = Math.round(start[1] + (mid[1]-start[1]) * localT);
                const b = Math.round(start[2] + (mid[2]-start[2]) * localT);
                out.push(rgbToHex(r,g,b));
            } else {
                const localT = (t-0.5) / 0.5;
                const r = Math.round(mid[0] + (end[0]-mid[0]) * localT);
                const g = Math.round(mid[1] + (end[1]-mid[1]) * localT);
                const b = Math.round(mid[2] + (end[2]-mid[2]) * localT);
                out.push(rgbToHex(r,g,b));
            }
        }
        return out;
    }

    const baseGray = '#6c757d';
    const midYellow = '#FFB300';
    const baseOrange = '#FF6600';
    const palette = generateThreeStopScale(baseGray, midYellow, baseOrange, uniqueYears.length || 1);

    const datasets = uniqueYears.map((year, index) => ({
        label: year,
        data: salesByYearMonth[year] || Array(12).fill(0),
        borderColor: palette[index % palette.length],
        backgroundColor: palette[index % palette.length] + "33",
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
                legend: {
                    position: 'top',
                    labels: { font: { size: 18, family: 'Poppins, Arial, sans-serif', weight: 'bold' } }
                },
                tooltip: {
                    padding: 12,
                    usePointStyle: true,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    borderRadius: 6,
                    titleFont: { size: 16, family: 'Poppins, Arial, sans-serif', weight: 'bold' },
                    bodyFont: { size: 18, family: 'Poppins, Arial, sans-serif', weight: 'bold' },
                    footerFont: { size: 16, family: 'Poppins, Arial, sans-serif', weight: 'bold' },
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
                datalabels: {
                    color: 'white',
                    font: { family: 'Poppins, Arial, sans-serif', size: 14, weight: '700' },
                    anchor: 'end',
                    align: 'top',
                    clamp: true,
                    // ✅ ALTERAÇÃO: A função formatter foi ajustada para remover o "R$"
                    formatter: function(value) {
                        if (!value || value === 0) return '';
                        const num = Number(value);
                        if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1).replace('.0','') + ' mi';
                        if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1).replace('.0','') + 'k';
                        return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    }
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            const num = Number(value);
                            if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1) + ' mi';
                            if (Math.abs(num) >= 1000) return (num / 1000).toFixed(0) + 'k';
                            return num;
                        },
                        font: { size: 16 },
                        color: '#adb5bd'
                    },
                    grid: { color: 'rgba(255,255,255,0.04)' }
                },
                x: {
                    ticks: { font: { size: 16 }, color: '#adb5bd' }
                }
            },
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
                {
                    label: "Pós Venda",
                    data: posVendasAnual,
                    backgroundColor: function(context) {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        if (!chartArea) {
                            return '#6c757d';
                        }
                        // Gradiente horizontal: esquerda para direita
                        const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
                        gradient.addColorStop(0, '#ADB5BD'); // Claro à esquerda
                        gradient.addColorStop(0.5, '#6c757d');
                        gradient.addColorStop(1, '#343A40'); // Escuro à direita
                        return gradient;
                    }
                },
                {
                    label: "Venda",
                    data: vendasAnual,
                    backgroundColor: function(context) {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        if (!chartArea) {
                            return '#FF6600';
                        }
                        // Gradiente horizontal: esquerda para direita
                        const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
                        gradient.addColorStop(0, '#e65500'); // Escuro à esquerda
                        gradient.addColorStop(0.5, '#FF6600');
                        gradient.addColorStop(1, '#ff8a33'); // Claro à direita
                        return gradient;
                    }
                },
            ],
        },
        options: {
            plugins: {
                legend: {
                    labels: {
                        generateLabels: function(chart) {
                            const datasets = chart.data.datasets;
                            return datasets.map((ds, i) => {
                                let fillStyle = '#ADB5BD';
                                if (ds.label === 'Venda') fillStyle = '#FF6600';
                                if (ds.label === 'Pós Venda') fillStyle = '#ADB5BD';
                                return {
                                    text: (ds.label || '').toString().toUpperCase(),
                                    fillStyle: fillStyle,
                                    hidden: !!ds.hidden,
                                    lineCap: ds.borderCapStyle || 'butt',
                                    lineDash: ds.borderDash || [],
                                    lineDashOffset: ds.borderDashOffset || 0,
                                    lineJoin: ds.borderJoinStyle || 'miter',
                                    fontColor: '#F8F9FA',
                                    lineWidth: ds.borderWidth || 0,
                                    strokeStyle: ds.borderColor || 'transparent',
                                    datasetIndex: i,
                                    pointStyle: ds.pointStyle || 'rect',
                                    pointRadius: ds.pointRadius || 5,
                                    boxWidth: 20,
                                    boxHeight: 10
                                };
                            });
                        }
                    }
                }
            },
            devicePixelRatio: window.devicePixelRatio,
            maintainAspectRatio: false,
            indexAxis: "y",
            interaction: { mode: "y", intersect: false },
            scales: {
                x: {
                    stacked: true,
                    ticks: {
                        font: { size: 16, family: 'Poppins, Arial, sans-serif' },
                        color: '#adb5bd',
                        callback: function(value) {
                            const num = Number(value);
                            if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1).replace('.0','') + ' mi';
                            if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1).replace('.0','') + 'k';
                            return num;
                        }
                    },
                    grid: { color: 'rgba(255,255,255,0.04)' }
                },
                y: {
                    stacked: true,
                    ticks: {
                        font: { size: 16, family: 'Poppins, Arial, sans-serif' },
                        color: '#adb5bd'
                    }
                }
            },
            plugins: {
                datalabels: {
                    color: function(context) {
                        if (context.dataset.label === 'Pós Venda') {
                            return '#212529'; // Escuro para contraste no cinza
                        }
                        return '#FFFFFF'; // Branco para laranja
                    },
                    font: { weight: "bold", size: 14, family: 'Poppins, Arial, sans-serif' },
                    align: 'center',
                    anchor: 'center',
                    clip: true,
                    formatter: function (value) {
                        if (value === 0) return "";
                        if (value >= 1000000) return (value / 1000000).toFixed(1).replace(".0", "") + " mi";
                        if (value >= 1000) return (value / 1000).toFixed(1).replace(".0", "") + "k";
                        return value;
                    },
                },
                tooltip: {
                    padding: 12,
                    usePointStyle: true,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    borderRadius: 6,
                    bodyFont: { size: 18, family: 'Poppins, Arial, sans-serif', weight: 'bold' },
                    titleFont: { size: 16, family: 'Poppins, Arial, sans-serif', weight: 'bold' },
                    footerFont: { size: 16, family: 'Poppins, Arial, sans-serif', weight: 'bold' },
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
                {
                    label: "Pós Venda",
                    data: posVendasMensal,
                    backgroundColor: function(context) {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        if (!chartArea) {
                            return '#6c757d';
                        }
                        // Gradiente vertical: cima para baixo
                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        gradient.addColorStop(0, '#E9ECEF'); // Cinza bem claro no topo
                        gradient.addColorStop(0.5, '#ADB5BD'); // Cinza claro no meio
                        gradient.addColorStop(1, '#6c757d'); // Cinza médio na base
                        return gradient;
                    }
                },
                {
                    label: "Venda",
                    data: vendasMensal,
                    backgroundColor: function(context) {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        if (!chartArea) {
                            return '#FF6600';
                        }
                        // Gradiente vertical: cima para baixo
                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        gradient.addColorStop(0, '#ff8a33'); // Claro no topo
                        gradient.addColorStop(0.5, '#FF6600');
                        gradient.addColorStop(1, '#e65500'); // Escuro na base
                        return gradient;
                    }
                },
            ],
        },
        options: {
            plugins: {
                legend: {
                    labels: {
                        generateLabels: function(chart) {
                            const datasets = chart.data.datasets;
                            return datasets.map((ds, i) => {
                                let fillStyle = '#ADB5BD';
                                if (ds.label === 'Venda') fillStyle = '#FF6600';
                                if (ds.label === 'Pós Venda') fillStyle = '#ADB5BD';
                                return {
                                    text: (ds.label || '').toString().toUpperCase(),
                                    fillStyle: fillStyle,
                                    hidden: !!ds.hidden,
                                    lineCap: ds.borderCapStyle || 'butt',
                                    lineDash: ds.borderDash || [],
                                    lineDashOffset: ds.borderDashOffset || 0,
                                    lineJoin: ds.borderJoinStyle || 'miter',
                                    fontColor: '#F8F9FA',
                                    lineWidth: ds.borderWidth || 0,
                                    strokeStyle: ds.borderColor || 'transparent',
                                    datasetIndex: i,
                                    pointStyle: ds.pointStyle || 'rect',
                                    pointRadius: ds.pointRadius || 5,
                                    boxWidth: 20,
                                    boxHeight: 10
                                };
                            });
                        }
                    }
                }
            },
            devicePixelRatio: window.devicePixelRatio,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            scales: {
                x: {
                    stacked: true,
                    ticks: { font: { size: 16, family: 'Poppins, Arial, sans-serif' }, color: '#adb5bd' },
                    grid: { color: 'rgba(255,255,255,0.04)' }
                },
                y: {
                    stacked: true,
                    ticks: {
                        font: { size: 16, family: 'Poppins, Arial, sans-serif' },
                        color: '#adb5bd',
                        callback: function(value) {
                            const num = Number(value);
                            if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1).replace('.0','') + ' mi';
                            if (Math.abs(num) >= 1000) return (num / 1000).toFixed(0) + 'k';
                            return num;
                        }
                    },
                    grid: { color: 'rgba(255,255,255,0.04)' }
                }
            },
            plugins: {
                datalabels: {
                    color: function(context) {
                        if (context.dataset.label === 'Pós Venda') {
                            return '#212529'; // Escuro para contraste no cinza
                        }
                        return '#FFFFFF'; // Branco para laranja
                    },
                    font: { weight: "bold", family: 'Poppins, Arial, sans-serif', size: 14 },
                    formatter: function (value) {
                        if (value === 0) return "";
                        if (value >= 1000000) return (value / 1000000).toFixed(1).replace(".0", "") + " mi";
                        if (value >= 1000) return (value / 1000).toFixed(0) + "k";
                        return value;
                    },
                },
                tooltip: {
                    padding: 12,
                    caretPadding: 6,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    titleFont: { family: 'Poppins, Arial, sans-serif', size: 16, weight: '600' },
                    bodyFont: { family: 'Poppins, Arial, sans-serif', size: 18, weight: '700' },
                    footerFont: { family: 'Poppins, Arial, sans-serif', size: 16, weight: '600' },
                    cornerRadius: 6,
                    usePointStyle: true,
                    displayColors: true,
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
                        }
                    }
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
            datasets: [{
                label: "Ticket Médio",
                data: annualTicketData,
                backgroundColor: function(context) {
                    const chart = context.chart;
                    const {ctx, chartArea} = chart;
                    if (!chartArea) {
                        return '#FF6600';
                    }
                    // Gradiente horizontal: esquerda para direita
                    const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
                    gradient.addColorStop(0, '#e65500'); // Escuro à esquerda
                    gradient.addColorStop(0.5, '#FF6600');
                    gradient.addColorStop(1, '#ff8a33'); // Claro à direita
                    return gradient;
                }
            }],
        },
        options: {
            maintainAspectRatio: false,
            indexAxis: "y",
            plugins: {
                datalabels: {
                    anchor: "end",
                    align: "end",
                    color: "white",
                    font: { weight: "bold", family: 'Poppins, Arial, sans-serif', size: 14 },
                    // ✅ ALTERAÇÃO: A função formatter foi ajustada para remover o "R$"
                    formatter: function(value) {
                        if (!value || value === 0) return "";
                        const num = Number(value);
                        if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1).replace('.0','') + 'k';
                        return num.toLocaleString('pt-BR'); // Usa formatação local sem moeda
                    }
                },
                tooltip: {
                    padding: 12,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    titleFont: { family: 'Poppins, Arial, sans-serif', size: 16, weight: '600' },
                    bodyFont: { family: 'Poppins, Arial, sans-serif', size: 18, weight: '700' },
                    footerFont: { family: 'Poppins, Arial, sans-serif', size: 16, weight: '600' },
                    cornerRadius: 6,
                    displayColors: true,
                    callbacks: { label: (context) => `Ticket Médio: ${formatCurrency(context.parsed.x)}` }
                },
                legend: { display: false },
            },
            scales: {
                x: {
                    beginAtZero: true,
                    afterDataLimits: (scale) => { scale.max *= 1.2; },
                    ticks: {
                        font: { size: 16, family: 'Poppins, Arial, sans-serif' },
                        color: '#adb5bd',
                        callback: function(value) {
                            const num = Number(value);
                            if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1).replace('.0','') + ' mi';
                            if (Math.abs(num) >= 1000) return (num / 1000).toFixed(0) + 'k';
                            return num;
                        }
                    },
                    grid: { color: 'rgba(255,255,255,0.04)' }
                },
                y: {
                    ticks: { font: { size: 16, family: 'Poppins, Arial, sans-serif' }, color: '#adb5bd' },
                    grid: { color: 'rgba(255,255,255,0.04)' }
                }
            },
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
            datasets: [{
                label: "Ticket Médio",
                data: monthlyTicketData,
                backgroundColor: function(context) {
                    const chart = context.chart;
                    const {ctx, chartArea} = chart;
                    if (!chartArea) {
                        return '#FF6600';
                    }
                    // Gradiente vertical: cima para baixo
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, '#ff8a33'); // Claro no topo
                    gradient.addColorStop(0.5, '#FF6600');
                    gradient.addColorStop(1, '#e65500'); // Escuro na base
                    return gradient;
                }
            }],
        },
        options: {
            maintainAspectRatio: false,
            plugins: {
                datalabels: {
                    anchor: "end",
                    align: "end",
                    color: "white",
                    font: { weight: "bold", family: 'Poppins, Arial, sans-serif', size: 14 },
                    // ✅ ALTERAÇÃO: A função formatter foi ajustada para remover o "R$"
                    formatter: function(value) {
                        if (!value || value === 0) return "";
                        const num = Number(value);
                        if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1).replace('.0','') + 'k';
                        return num.toLocaleString('pt-BR'); // Usa formatação local sem moeda
                    }
                },
                tooltip: {
                    padding: 12,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    titleFont: { family: 'Poppins, Arial, sans-serif', size: 16, weight: '600' },
                    bodyFont: { family: 'Poppins, Arial, sans-serif', size: 18, weight: '700' },
                    footerFont: { family: 'Poppins, Arial, sans-serif', size: 16, weight: '600' },
                    cornerRadius: 6,
                    displayColors: true,
                    callbacks: { label: (context) => `Ticket Médio: ${formatCurrency(context.parsed.y)}` }
                },
                legend: { display: false },
            },
            scales: {
                x: {
                    ticks: { font: { size: 16, family: 'Poppins, Arial, sans-serif' }, color: '#adb5bd' },
                    grid: { color: 'rgba(255,255,255,0.04)' }
                },
                y: {
                    beginAtZero: true,
                    max: maxValue > 0 ? maxValue * 1.2 : undefined,
                    ticks: {
                        font: { size: 16, family: 'Poppins, Arial, sans-serif' },
                        color: '#adb5bd',
                        callback: function(value) {
                            const num = Number(value);
                            if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1).replace('.0','') + ' mi';
                            if (Math.abs(num) >= 1000) return (num / 1000).toFixed(0) + 'k';
                            return num;
                        }
                    },
                    grid: { color: 'rgba(255,255,255,0.04)' }
                }
            },
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
    let selectedTipoServico, selectedTipoCliente, selectedConsultorComercial, selectedIndicacaoAdesao, selectedInstituicao, selectedFundosForCharts;
    
    const currentActivePage = document.getElementById('btn-page2')?.classList.contains('active') ? 'page2' : 'other';
    
    // 🔒 VERIFICAÇÃO ROBUSTA: SE NÃO ESTIVERMOS NA PÁGINA 2, FORÇAR FUNDOS VAZIO
    if (currentActivePage !== 'page2') {
        // 🛑 FORÇAR filtro de fundos como vazio nas páginas 1 e 3
        selectedTipoServico = [];
        selectedTipoCliente = [];
        selectedConsultorComercial = [];
        selectedIndicacaoAdesao = [];
        selectedInstituicao = [];
        selectedFundosForCharts = [];
        console.log('📊 🛑 updateContractsCharts - PÁGINAS 1/3 - FORÇANDO fundos VAZIO (ignorando:', selectedFundos, ')');
    } else {
        // ✅ PÁGINA 2: Aplicar filtro de fundos + filtros específicos
        selectedTipoServico = $("#tipo-servico-filter").val() || [];
        selectedTipoCliente = $("#tipo-cliente-filter").val() || [];
        selectedConsultorComercial = $("#consultor-comercial-filter").val() || [];
        selectedIndicacaoAdesao = $("#indicacao-adesao-filter").val() || [];
        selectedInstituicao = $("#instituicao-filter").val() || [];
        selectedFundosForCharts = selectedFundos;
        console.log('📊 ✅ updateContractsCharts - PÁGINA 2 - aplicando filtro de fundos:', selectedFundos);
        console.log('  - Tipo Serviço:', selectedTipoServico);
        console.log('  - Tipo Cliente:', selectedTipoCliente);
        console.log('  - Consultor Comercial:', selectedConsultorComercial);
        console.log('  - Indicação Adesão:', selectedIndicacaoAdesao);
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
            datasets: [{
                label: "Contratos",
                data: annualContractsData,
                backgroundColor: function(context) {
                    const chart = context.chart;
                    const {ctx, chartArea} = chart;
                    if (!chartArea) {
                        return '#FF6600';
                    }
                    // Gradiente horizontal: esquerda para direita
                    const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
                    gradient.addColorStop(0, '#e65500'); // Escuro à esquerda
                    gradient.addColorStop(0.5, '#FF6600');
                    gradient.addColorStop(1, '#ff8a33'); // Claro à direita
                    return gradient;
                }
            }],
        },
        options: {
            plugins: {
                legend: {
                    labels: {
                        generateLabels: function(chart) {
                            const datasets = chart.data.datasets;
                            return datasets.map((ds, i) => {
                                let fillStyle = '#FF6600';
                                if (ds.label === 'Contratos') fillStyle = '#FF6600';
                                return {
                                    text: (ds.label || '').toString().toUpperCase(),
                                    fillStyle: fillStyle,
                                    hidden: !!ds.hidden,
                                    lineCap: ds.borderCapStyle || 'butt',
                                    lineDash: ds.borderDash || [],
                                    lineDashOffset: ds.borderDashOffset || 0,
                                    lineJoin: ds.borderJoinStyle || 'miter',
                                    fontColor: '#F8F9FA',
                                    lineWidth: ds.borderWidth || 0,
                                    strokeStyle: ds.borderColor || 'transparent',
                                    datasetIndex: i,
                                    pointStyle: ds.pointStyle || 'rect',
                                    pointRadius: ds.pointRadius || 5,
                                    boxWidth: 20,
                                    boxHeight: 10
                                };
                            });
                        }
                    }
                }
            },
            maintainAspectRatio: false,
            indexAxis: "y",
            plugins: {
                datalabels: {
                    anchor: "end",
                    align: "end",
                    color: "white",
                    font: { family: 'Poppins, Arial, sans-serif', size: 14, weight: "600" },
                    formatter: (value) => value.toLocaleString("pt-BR"),
                    clamp: true,
                },
                tooltip: {
                    displayColors: true,
                    usePointStyle: true,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    titleFont: { family: 'Poppins, Arial, sans-serif', size: 16 },
                    bodyFont: { family: 'Poppins, Arial, sans-serif', size: 18, weight: '700' },
                    padding: 12,
                    cornerRadius: 6,
                    callbacks: { label: (context) => `Contratos: ${context.parsed.x.toLocaleString("pt-BR")}` }
                },
                legend: { display: false },
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const clickedYear = years[elements[0].index];
                    drawMonthlyContractsChart(fundosParaGraficos, clickedYear);
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { font: { family: 'Poppins, Arial, sans-serif', size: 16 }, color: '#adb5bd' },
                    grid: { color: 'rgba(255,255,255,0.04)' },
                },
                y: {
                    ticks: { font: { family: 'Poppins, Arial, sans-serif', size: 16 }, color: '#adb5bd' },
                    grid: { color: 'rgba(255,255,255,0.04)' },
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
    const maxValue = Math.max(...contractsByMonth);
    if (monthlyContractsChart) monthlyContractsChart.destroy();
    monthlyContractsChart = new Chart(document.getElementById("monthlyContractsChart"), {
        type: "bar",
        data: {
            labels: monthLabels,
            datasets: [{
                label: "Contratos",
                data: contractsByMonth,
                backgroundColor: function(context) {
                    const chart = context.chart;
                    const {ctx, chartArea} = chart;
                    if (!chartArea) {
                        return '#FF6600';
                    }
                    // Gradiente vertical: cima para baixo
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, '#ff8a33'); // Claro no topo
                    gradient.addColorStop(0.5, '#FF6600');
                    gradient.addColorStop(1, '#e65500'); // Escuro na base
                    return gradient;
                }
            }],
        },
        options: {
            plugins: {
                legend: {
                    labels: {
                        generateLabels: function(chart) {
                            const datasets = chart.data.datasets;
                            return datasets.map((ds, i) => {
                                let fillStyle = '#FF6600';
                                if (ds.label === 'Contratos') fillStyle = '#FF6600';
                                return {
                                    text: (ds.label || '').toString().toUpperCase(),
                                    fillStyle: fillStyle,
                                    hidden: !!ds.hidden,
                                    lineCap: ds.borderCapStyle || 'butt',
                                    lineDash: ds.borderDash || [],
                                    lineDashOffset: ds.borderDashOffset || 0,
                                    lineJoin: ds.borderJoinStyle || 'miter',
                                    fontColor: '#F8F9FA',
                                    lineWidth: ds.borderWidth || 0,
                                    strokeStyle: ds.borderColor || 'transparent',
                                    datasetIndex: i,
                                    pointStyle: ds.pointStyle || 'rect',
                                    pointRadius: ds.pointRadius || 5,
                                    boxWidth: 20,
                                    boxHeight: 10
                                };
                            });
                        }
                    }
                }
            },
            maintainAspectRatio: false,
            plugins: {
                datalabels: {
                    anchor: "end",
                    align: "end",
                    color: "white",
                    font: { family: 'Poppins, Arial, sans-serif', size: 14, weight: "600" },
                    formatter: (value) => (value > 0 ? value.toLocaleString("pt-BR") : ""),
                    clamp: false, // permite rótulo "vazar" para fora
                },
                tooltip: {
                    displayColors: true,
                    usePointStyle: true,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    titleFont: { family: 'Poppins, Arial, sans-serif', size: 16 },
                    bodyFont: { family: 'Poppins, Arial, sans-serif', size: 18, weight: '700' },
                    padding: 12,
                    cornerRadius: 6,
                    callbacks: { label: (context) => `Contratos: ${context.parsed.y.toLocaleString("pt-BR")}` }
                },
                legend: { display: false },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: maxValue > 0 ? Math.ceil(maxValue * 1.2) : 5, // espaço extra no topo
                    ticks: { font: { family: 'Poppins, Arial, sans-serif', size: 16 }, color: '#adb5bd' },
                    grid: { color: 'rgba(255,255,255,0.04)' },
                },
                x: {
                    ticks: { font: { family: 'Poppins, Arial, sans-serif', size: 16 }, color: '#adb5bd' },
                    grid: { color: 'rgba(255,255,255,0.04)' },
                }
            },
        },
    });
}

function updateDataTable(data) {
    // Agrupar dados por unidade, acumulando valores de todos os períodos
    const unidadesMap = new Map();
    const normalizeText = (text) => text?.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Recupera período selecionado (mesmo critério usado no restante do código)
    const startDateInput = document.getElementById("start-date");
    const endDateInput = document.getElementById("end-date");
    let startDate = null, endDate = null;
    if (startDateInput && endDateInput && startDateInput.value && endDateInput.value) {
        const [sY, sM, sD] = startDateInput.value.split('-').map(Number);
        const [eY, eM, eD] = endDateInput.value.split('-').map(Number);
        startDate = new Date(sY, sM - 1, sD, 0, 0, 0, 0);
        endDate = new Date(eY, eM - 1, eD, 23, 59, 59, 999);
    }

    data.forEach((d) => {
        const unidade = d.unidade;

        // Se a unidade ainda não foi inicializada no mapa, calcular os valores realizados
        // (Vendas / Pós-Vendas / Total) com base no intervalo selecionado APENAS UMA VEZ.
        if (!unidadesMap.has(unidade)) {
            // Filtra todas as vendas da unidade APENAS dentro do período selecionado.
            const vendasDoPeriodo = allData.filter((v) => {
                if (!v || !v.nm_unidade || !v.dt_cadastro_integrante) return false;
                if (v.nm_unidade !== unidade) return false;
                if (!startDate || !endDate) return false;
                return v.dt_cadastro_integrante >= startDate && v.dt_cadastro_integrante < endDate;
            });

            const realizadoVendas = vendasDoPeriodo.filter((v) => normalizeText(v.venda_posvenda) === "VENDA").reduce((sum, v) => sum + (v.vl_plano || 0), 0);
            const realizadoPosVendas = vendasDoPeriodo.filter((v) => normalizeText(v.venda_posvenda) === "POS VENDA").reduce((sum, v) => sum + (v.vl_plano || 0), 0);
            const realizadoTotalNoPeriodo = vendasDoPeriodo.reduce((sum, v) => sum + (v.vl_plano || 0), 0);

            unidadesMap.set(unidade, {
                realizado_vendas: realizadoVendas,
                realizado_posvendas: realizadoPosVendas,
                realizado_total: realizadoTotalNoPeriodo,
                meta_vendas: 0,
                meta_posvendas: 0,
                meta_total: 0
            });
        }

        const unidadeData = unidadesMap.get(unidade);

        // Acumular valores de meta (meta são por período e devem ser somadas em múltiplos meses)
        unidadeData.meta_vendas += d.meta_vvr_vendas;
        unidadeData.meta_posvendas += d.meta_vvr_posvendas;
        unidadeData.meta_total += d.meta_vvr_total;
    });
    
    // Converter Map para array e formatar dados
    // Gera linhas de unidade normalmente, mas NÃO inclui o total na ordenação
    let tableRows = Array.from(unidadesMap.entries()).map(([unidade, dados]) => {
        let realizado = 0;
        let meta = 0;
        if (currentTableDataType === "vendas") {
            realizado = dados.realizado_vendas;
            meta = aplicarMultiplicadorMeta(dados.meta_vendas);
        } else if (currentTableDataType === "posvendas") {
            realizado = dados.realizado_posvendas;
            meta = aplicarMultiplicadorMeta(dados.meta_posvendas);
        } else {
            realizado = dados.realizado_total;
            meta = aplicarMultiplicadorMeta(dados.meta_total);
        }
        const atingimentoVvr = meta > 0 ? realizado / meta : 0;
        const periodoSelecionado = getPeriodoSelecionadoFormatado();
        return [
            unidade, 
            periodoSelecionado, 
            {
                display: formatCurrency(realizado),
                sort: realizado,
                type: 'num'
            },
            {
                display: formatCurrency(meta),
                sort: meta,
                type: 'num'
            },
            {
                display: formatPercent(atingimentoVvr),
                sort: atingimentoVvr,
                type: 'num'
            }
        ];
    });
    // Ordena apenas as linhas de unidade
    tableRows = tableRows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));

    // Calcular totais gerais
    let totalRealizado = 0;
    let totalMeta = 0;
    Array.from(unidadesMap.values()).forEach(dados => {
        if (currentTableDataType === "vendas") {
            totalRealizado += dados.realizado_vendas;
            totalMeta += dados.meta_vendas;
        } else if (currentTableDataType === "posvendas") {
            totalRealizado += dados.realizado_posvendas;
            totalMeta += dados.meta_posvendas;
        } else {
            totalRealizado += dados.realizado_total;
            totalMeta += dados.meta_total;
        }
    });
    
    // Aplicar multiplicador apenas no final para evitar problemas
    const metaTotalFinal = aplicarMultiplicadorMeta(totalMeta);
    const atingimentoTotal = metaTotalFinal > 0 ? totalRealizado / metaTotalFinal : 0;
    
    // Salvar linha de totais separadamente para exibir em todas as páginas
    let totalRow = null;
    if (Array.from(unidadesMap.values()).length > 0) {
        const periodoSelecionado = getPeriodoSelecionadoFormatado();
        totalRow = [
            'TOTAL GERAL', 
            periodoSelecionado, 
            formatCurrency(totalRealizado), 
            formatCurrency(metaTotalFinal), 
            formatPercent(atingimentoTotal)
        ];
    }
    
    // Função auxiliar para obter período formatado
    function getPeriodoSelecionadoFormatado() {
        const startDateInput = document.getElementById("start-date");
        const endDateInput = document.getElementById("end-date");
        
        if (startDateInput && endDateInput && startDateInput.value && endDateInput.value) {
            // Ajustar para timezone local para evitar problemas de fuso horário
            const startDate = new Date(startDateInput.value + 'T12:00:00');
            const endDate = new Date(endDateInput.value + 'T12:00:00');
            
            const formatMes = (date) => {
                const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 
                              'jul', 'ago', 'set', 'out', 'nov', 'dez'];
                const ano = date.getFullYear().toString().slice(-2); // Últimos 2 dígitos do ano
                return `${meses[date.getMonth()]}/${ano}`;
            };
            
            // Verificar se é o mesmo mês e ano
            if (startDate.getFullYear() === endDate.getFullYear() && 
                startDate.getMonth() === endDate.getMonth()) {
                return formatMes(startDate);
            } else {
                return `${formatMes(startDate)} - ${formatMes(endDate)}`;
            }
        }
        
        return "Período Selecionado";
    }

    if (dataTable) {
        // Limpa a tabela e adiciona apenas os dados das unidades (sem o total)
        dataTable.clear().rows.add(tableRows).draw();
        
        // Adiciona a linha de total fixo após cada redesenho
        if (totalRow) {
            addTotalRowToTable(totalRow);
        }
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
            data: tableRows, // Apenas dados das unidades, sem o total
            pageLength: 10,
            columns: [
                { title: "Unidade", type: "string" },
                { title: "Período", type: "string" },
                { title: `VVR Realizado ${getTipo()}`, type: "currency" },
                { title: `Meta VVR ${getTipo()}`, type: "currency" },
                { title: `Atingimento VVR ${getTipo()}`, type: "percent" }
            ],
            columnDefs: [
                {
                    // Colunas de valores monetários (VVR Realizado e Meta VVR)
                    targets: [2, 3],
                    type: "num",
                    render: function(data, type, row) {
                        if (typeof data === 'object' && data !== null) {
                            if (type === 'display') {
                                return data.display; // Formatação para exibição
                            }
                            if (type === 'sort' || type === 'type') {
                                return data.sort; // Valor numérico para ordenação
                            }
                        }
                        // Fallback para dados em formato string
                        if (type === 'sort' || type === 'type') {
                            const numericValue = parseFloat(data.replace("R$", "").replace(/\./g, "").replace(",", ".").trim()) || 0;
                            return numericValue;
                        }
                        return data;
                    }
                },
                {
                    // Coluna de porcentagem (Atingimento VVR)
                    targets: [4],
                    type: "num",
                    render: function(data, type, row) {
                        if (typeof data === 'object' && data !== null) {
                            if (type === 'display') {
                                return data.display; // Formatação para exibição
                            }
                            if (type === 'sort' || type === 'type') {
                                return data.sort; // Valor numérico para ordenação
                            }
                        }
                        // Fallback para dados em formato string
                        if (type === 'sort' || type === 'type') {
                            const numericValue = parseFloat(data.replace("%", "").replace(",", ".").trim()) || 0;
                            return numericValue;
                        }
                        return data;
                    }
                }
            ],
            language: {
                sEmptyTable: "Nenhum registro disponível na tabela",
                sInfo: "Mostrando _START_ a _END_ de _TOTAL_ entradas",
                sInfoEmpty: "Mostrando 0 a 0 de 0 entradas",
                sInfoFiltered: "(filtrado de _MAX_ registros no total)",
                sLengthMenu: "Mostrar _MENU_ entradas",
                sLoadingRecords: "Carregando...",
                sProcessing: "Processando...",
                sSearch: "Pesquisar:",
                sZeroRecords: "Nenhum registro encontrado",
                oPaginate: { sFirst: "Primeiro", sPrevious: "Anterior", sNext: "Próximo", sLast: "Último" },
                oAria: { sSortAscending: ": ativar para ordenar a coluna de forma ascendente", sSortDescending: ": ativar para ordenar a coluna de forma descendente" }
            },
            destroy: true,
            dom: "Bfrtip",
            drawCallback: function(settings) {
                // Adiciona a linha de total após cada redesenho da página
                if (totalRow) {
                    addTotalRowToTable(totalRow);
                }
            },
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
                    // Exclui a linha TOTAL GERAL da exportação se desejado
                    rows: function(idx, data, node) {
                        return data[0] !== 'TOTAL GERAL';
                    }
                },
            }],
            // Ordenação padrão pela primeira coluna (Unidade)
            order: [[0, 'asc']]
        });
        
        // Adiciona a linha de total inicial se existir
        if (totalRow) {
            addTotalRowToTable(totalRow);
        }
    }
}

// Função para adicionar linha de total fixo em todas as páginas
function addTotalRowToTable(totalRowData) {
    // Remove linha de total existente se houver
    $('#dados-table .total-row').remove();
    
    // Cria nova linha de total
    const totalRowHtml = `
        <tr class="total-row">
            <td>${totalRowData[0]}</td>
            <td>${totalRowData[1]}</td>
            <td>${totalRowData[2]}</td>
            <td>${totalRowData[3]}</td>
            <td>${totalRowData[4]}</td>
        </tr>
    `;
    
    // Adiciona a linha de total após a última linha da página atual
    $('#dados-table tbody').append(totalRowHtml);
}

function addEventListeners() {
    document.getElementById("start-date").addEventListener("change", updateDashboard);
    document.getElementById("end-date").addEventListener("change", updateDashboard);

    document.querySelectorAll(".page-navigation button").forEach((button) => {
        button.addEventListener("click", function () {
            const previousPage = document.querySelector(".page-navigation button.active")?.dataset.page;
            const newPage = this.dataset.page;
            
            console.log('🔄 Navegação de página:', previousPage, '→', newPage);
            
            // 🚨 TRANSIÇÃO SUAVE: Ocultar filtros ANTES da limpeza
            if (previousPage === "page2" && newPage !== "page2") {
                console.log('🧹 Saindo da página 2 - iniciando transição suave...');
                
                // ✅ FASE 1: Ocultar filtros com transição suave
                const filtersToHide = [
                    '#tipo-adesao-filter-container',
                    '#tipo-servico-filter-container', 
                    '#tipo-cliente-filter-container',
                    '#consultor-comercial-filter-container',
                    '#indicacao-adesao-filter-container',
                    '#instituicao-filter-container'
                ];
                
                filtersToHide.forEach(selector => {
                    const element = document.querySelector(selector);
                    if (element && element.style.visibility !== 'hidden') {
                        element.classList.remove('smooth-showing');
                        element.classList.add('smooth-hiding');
                    }
                });
                
                // ✅ FASE 2: Aguardar transição e então limpar (timing reduzido)
                setTimeout(() => {
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
                    $("#consultor-comercial-filter").val([]);
                    $("#indicacao-adesao-filter").val([]);
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
                        if ($("#consultor-comercial-filter").data('multiselect')) {
                            $("#consultor-comercial-filter").multiselect('refresh');
                        }
                        if ($("#indicacao-adesao-filter").data('multiselect')) {
                            $("#indicacao-adesao-filter").multiselect('refresh');
                        }
                        if ($("#instituicao-filter").data('multiselect')) {
                            $("#instituicao-filter").multiselect('refresh');
                        }
                        console.log('🧹 ✅ Filtros específicos limpos SILENCIOSAMENTE');
                    } catch (error) {
                        console.log('🧹 Erro ao atualizar multiselects:', error);
                    }
                    
                    // 🔄 ATUALIZAR DASHBOARD **ANTES** DA MUDANÇA VISUAL
                    console.log('🔄 Atualizando dashboard ANTES da mudança visual...');
                    updateDashboard();
                }, 200); // Timing reduzido para fluidez
            }
            
            // ✅ MUDANÇA VISUAL DA PÁGINA - Sempre executar
            document.querySelectorAll(".page-navigation button").forEach((btn) => btn.classList.remove("active"));
            this.classList.add("active");
            document.querySelectorAll(".page-content").forEach((page) => page.classList.remove("active"));
            document.getElementById(this.dataset.page).classList.add("active");
            
            // 🎯 CONTROLAR VISIBILIDADE DOS CONTROLES DE META (apenas página 1)
            const metaToggleSection = document.getElementById('meta-toggle-section');
            if (metaToggleSection) {
                if (newPage === 'page1') {
                    metaToggleSection.style.display = 'block';
                    console.log('🎯 Controles de meta MOSTRADOS (página 1)');
                } else {
                    metaToggleSection.style.display = 'none';
                    console.log('🎯 Controles de meta OCULTOS (página ' + newPage + ')');
                }
            }

        // Rola para o topo ao trocar de página
        window.scrollTo(0, 0);
            
            // Recarregar os filtros sempre que mudar de/para a página do funil (page3)
            if ((previousPage === "page3" || newPage === "page3") && 
                previousPage !== newPage) {
                
                console.log('🔄 Mudança de página detectada:', previousPage, '→', newPage);
                
                // Pequeno delay para garantir que a mudança de página terminou
                setTimeout(() => {
                    console.log('🔄 Recarregando filtros após mudança de página...');
                    // CORREÇÃO: Preservar seleção do filtro rápido ou seleção atual
                    const currentUnidadesSelection = $("#unidade-filter").val() || [];
                    const unidadesToPreserve = lastQuickFilterSelection || currentUnidadesSelection;
                    console.log('💾 Preservando seleção de unidades:', unidadesToPreserve);
                    console.log('   - Filtro rápido ativo:', !!lastQuickFilterSelection);
                    
                    if (userAccessLevel === "ALL_UNITS") {
                        retryPopulateFilters(unidadesToPreserve);
                    } else if (Array.isArray(userAccessLevel)) {
                        retryUpdateDependentFilters(userAccessLevel);
                    } else {
                        // Para usuário único, recriar a lógica dos filtros
                        retryPopulateFilters(unidadesToPreserve);
                    }
                }, 100);
            }
            
            // 🆕 FORÇAR APLICAÇÃO DA VISIBILIDADE DOS FILTROS APÓS QUALQUER MUDANÇA DE PÁGINA
            setTimeout(() => {
                console.log('🔧 Aplicando visibilidade dos filtros após navegação...');
                
                // ✅ TRANSIÇÃO SUAVE: Mostrar filtros da nova página
                if (newPage === "page2") {
                    // Remover classe hiding se existir
                    const filtersToShow = [
                        '#tipo-adesao-filter-container',
                        '#tipo-servico-filter-container', 
                        '#tipo-cliente-filter-container',
                        '#consultor-comercial-filter-container',
                        '#indicacao-adesao-filter-container',
                        '#instituicao-filter-container'
                    ];
                    
                    filtersToShow.forEach(selector => {
                        const element = document.querySelector(selector);
                        if (element) {
                            element.classList.remove('smooth-hiding');
                            element.classList.add('smooth-showing');
                        }
                    });
                }
                
                applyFundosFilterVisibility();
                applyTipoAdesaoFilterVisibility();
                applyTipoServicoFilterVisibility();
                applyTipoClienteFilterVisibility();
                applyConsultorComercialFilterVisibility();
                applyIndicacaoAdesaoFilterVisibility();
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
            // Mostrar sem transição na inicialização, com transição na navegação
            fundoFilterContainer.style.display = 'block';
            fundoFilterContainer.style.visibility = 'visible';
            
            // Aplicar transição suave apenas se estivermos navegando
            if (fundoFilterContainer.classList.contains('smooth-hiding')) {
                fundoFilterContainer.classList.remove('smooth-hiding');
                fundoFilterContainer.classList.add('smooth-showing');
            }
            
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
                        ,onDropdownShow: function(event) {
                            $(this.$select).closest('.filter-item').addClass('filter-active');
                        },
                        onDropdownHide: function(event) {
                            $(this.$select).closest('.filter-item').removeClass('filter-active');
                        }
                    });
                    console.log('🔧 ✅ Multiselect FUNDOS reinicializado com sucesso');
                } catch (error) {
                    console.error('🔧 ❌ Erro ao reinicializar multiselect FUNDOS:', error);
                }
            }, 100);
            
        } else {
            // Aplicar transição suave apenas se já estiver visível
            if (fundoFilterContainer.style.visibility !== 'hidden') {
                fundoFilterContainer.classList.remove('smooth-showing');
                fundoFilterContainer.classList.add('smooth-hiding');
                setTimeout(() => {
                    fundoFilterContainer.style.display = 'none';
                    fundoFilterContainer.style.visibility = 'hidden';
                }, 300);
            } else {
                // Ocultar imediatamente se já estiver oculto
                fundoFilterContainer.style.display = 'none';
                fundoFilterContainer.style.visibility = 'hidden';
            }
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
            // Mostrar sem transição na inicialização, com transição na navegação
            tipoAdesaoFilterContainer.style.display = 'block';
            tipoAdesaoFilterContainer.style.visibility = 'visible';
            
            // Aplicar transição suave apenas se estivermos navegando
            if (tipoAdesaoFilterContainer.classList.contains('smooth-hiding')) {
                tipoAdesaoFilterContainer.classList.remove('smooth-hiding');
                tipoAdesaoFilterContainer.classList.add('smooth-showing');
            }
            
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
                        ,onDropdownShow: function(event) {
                            $(this.$select).closest('.filter-item').addClass('filter-active');
                        },
                        onDropdownHide: function(event) {
                            $(this.$select).closest('.filter-item').removeClass('filter-active');
                        }
                    });
                    console.log('🔧 ✅ Multiselect TIPO ADESÃO reinicializado com sucesso');
                } catch (error) {
                    console.error('🔧 ❌ Erro ao reinicializar multiselect TIPO ADESÃO:', error);
                }
            }, 100);
            
        } else {
            // Aplicar transição suave apenas se já estiver visível
            if (tipoAdesaoFilterContainer.style.visibility !== 'hidden') {
                tipoAdesaoFilterContainer.classList.remove('smooth-showing');
                tipoAdesaoFilterContainer.classList.add('smooth-hiding');
                setTimeout(() => {
                    tipoAdesaoFilterContainer.style.display = 'none';
                    tipoAdesaoFilterContainer.style.visibility = 'hidden';
                }, 300);
            } else {
                // Ocultar imediatamente se já estiver oculto
                tipoAdesaoFilterContainer.style.display = 'none';
                tipoAdesaoFilterContainer.style.visibility = 'hidden';
            }
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
            // Mostrar sem transição na inicialização, com transição na navegação
            tipoServicoFilterContainer.style.display = 'block';
            tipoServicoFilterContainer.style.visibility = 'visible';
            
            // Aplicar transição suave apenas se estivermos navegando
            if (tipoServicoFilterContainer.classList.contains('smooth-hiding')) {
                tipoServicoFilterContainer.classList.remove('smooth-hiding');
                tipoServicoFilterContainer.classList.add('smooth-showing');
            }
            
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
                        ,onDropdownShow: function(event) {
                            $(this.$select).closest('.filter-item').addClass('filter-active');
                        },
                        onDropdownHide: function(event) {
                            $(this.$select).closest('.filter-item').removeClass('filter-active');
                        }
                    });
                    console.log('🔧 ✅ Multiselect TIPO SERVIÇO reinicializado com sucesso');
                } catch (error) {
                    console.error('🔧 ❌ Erro ao reinicializar multiselect TIPO SERVIÇO:', error);
                }
            }, 100);
            
        } else {
            // Aplicar transição suave apenas se já estiver visível
            if (tipoServicoFilterContainer.style.visibility !== 'hidden') {
                tipoServicoFilterContainer.classList.remove('smooth-showing');
                tipoServicoFilterContainer.classList.add('smooth-hiding');
                setTimeout(() => {
                    tipoServicoFilterContainer.style.display = 'none';
                    tipoServicoFilterContainer.style.visibility = 'hidden';
                }, 300);
            } else {
                // Ocultar imediatamente se já estiver oculto
                tipoServicoFilterContainer.style.display = 'none';
                tipoServicoFilterContainer.style.visibility = 'hidden';
            }
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
            // Mostrar sem transição na inicialização, com transição na navegação
            tipoClienteFilterContainer.style.display = 'block';
            tipoClienteFilterContainer.style.visibility = 'visible';
            
            // Aplicar transição suave apenas se estivermos navegando
            if (tipoClienteFilterContainer.classList.contains('smooth-hiding')) {
                tipoClienteFilterContainer.classList.remove('smooth-hiding');
                tipoClienteFilterContainer.classList.add('smooth-showing');
            }
            
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
                        ,onDropdownShow: function(event) {
                            $(this.$select).closest('.filter-item').addClass('filter-active');
                        },
                        onDropdownHide: function(event) {
                            $(this.$select).closest('.filter-item').removeClass('filter-active');
                        }
                    });
                    console.log('👥 ✅ Multiselect TIPO CLIENTE reinicializado com sucesso');
                } catch (error) {
                    console.error('👥 ❌ Erro ao reinicializar multiselect TIPO CLIENTE:', error);
                }
            }, 100);
            
        } else {
            // Aplicar transição suave apenas se já estiver visível
            if (tipoClienteFilterContainer.style.visibility !== 'hidden') {
                tipoClienteFilterContainer.classList.remove('smooth-showing');
                tipoClienteFilterContainer.classList.add('smooth-hiding');
                setTimeout(() => {
                    tipoClienteFilterContainer.style.display = 'none';
                    tipoClienteFilterContainer.style.visibility = 'hidden';
                }, 300);
            } else {
                // Ocultar imediatamente se já estiver oculto
                tipoClienteFilterContainer.style.display = 'none';
                tipoClienteFilterContainer.style.visibility = 'hidden';
            }
            console.log('👥 ✅ TIPO CLIENTE FORÇADO PARA OCULTO');
        }
    } else {
        console.log('👥 ❌ tipoClienteFilterContainer não encontrado');
    }
}

// 🆕 Função para controlar visibilidade do filtro Consultor Comercial (só página 2)
function applyConsultorComercialFilterVisibility() {
    const consultorComercialFilterContainer = document.getElementById('consultor-comercial-filter-container');
    
    if (consultorComercialFilterContainer) {
        const currentActivePage = document.getElementById('btn-page2')?.classList.contains('active') ? 'page2' : 'other';
        
        if (currentActivePage === 'page2') {
            // Mostrar sem transição na inicialização, com transição na navegação
            consultorComercialFilterContainer.style.display = 'block';
            consultorComercialFilterContainer.style.visibility = 'visible';
            
            // Aplicar transição suave apenas se estivermos navegando
            if (consultorComercialFilterContainer.classList.contains('smooth-hiding')) {
                consultorComercialFilterContainer.classList.remove('smooth-hiding');
                consultorComercialFilterContainer.classList.add('smooth-showing');
            }
            
            console.log('👨‍💼 ✅ CONSULTOR COMERCIAL mostrado para página 2');
            
            const consultorComercialFilter = $('#consultor-comercial-filter');
            
            // População baseada apenas em ADESÕES
            setTimeout(() => {
                const consultoresComerciais = new Set();
                let temCamposVazios = false;
                
                // Buscar dados de ADESÕES
                if (allData && allData.length > 0) {
                    allData.forEach(d => {
                        if (d.consultor_comercial && d.consultor_comercial !== 'N/A' && d.consultor_comercial.trim() !== '') {
                            consultoresComerciais.add(d.consultor_comercial.trim().toUpperCase());
                        } else {
                            // Detectar se há campos vazios
                            temCamposVazios = true;
                        }
                    });
                    console.log('👨‍💼 Consultores comerciais encontrados em ADESÕES:', consultoresComerciais.size);
                    console.log('👨‍💼 Tem campos vazios/N/A:', temCamposVazios);
                }
                
                if (consultoresComerciais.size > 0 || temCamposVazios) {
                    consultorComercialFilter.empty();
                    
                    const consultoresUnicos = [...consultoresComerciais].sort();
                    
                    // ✅ ADICIONAR opção para campos vazios se existirem
                    if (temCamposVazios) {
                        consultorComercialFilter.append($("<option>", { value: "VAZIO", text: "(Campos Vazios/N/A)" }));
                        console.log('👨‍💼 Adicionando opção para campos vazios');
                    }
                    
                    console.log('👨‍💼 Consultores Comerciais ÚNICOS encontrados:', consultoresUnicos);
                    
                    consultoresUnicos.forEach((c) => {
                        consultorComercialFilter.append($("<option>", { value: c, text: c }));
                        console.log('👨‍💼 Adicionando opção Consultor Comercial:', c);
                    });
                } else {
                    console.log('👨‍💼 ❌ Nenhum consultor comercial encontrado');
                }
            }, 50);
            
            // Reinicializar multiselect
            setTimeout(() => {
                console.log('👨‍💼 Reinicializando multiselect do CONSULTOR COMERCIAL...');
                try {
                    if (consultorComercialFilter.data('multiselect')) {
                        consultorComercialFilter.multiselect('destroy');
                    }
                    
                    consultorComercialFilter.multiselect({
                        includeSelectAllOption: true,
                        selectAllText: "Marcar todos",
                        allSelectedText: "Todos os consultores",
                        nonSelectedText: "Todos os consultores",
                        enableFiltering: true,  // ✅ ADICIONAR caixa de pesquisa
                        filterPlaceholder: "Pesquisar consultores...",  // ✅ Placeholder da pesquisa
                        buttonWidth: '100%',
                        maxHeight: 300,
                        numberDisplayed: 2,
                        onChange: function(option, checked) {
                            console.log('👨‍💼 Consultor Comercial filter changed:', option, 'checked:', checked);
                            const currentPage = document.getElementById('btn-page2')?.classList.contains('active') ? 'page2' : 'other';
                            if (currentPage === 'page2') {
                                console.log('👨‍💼 ✅ Atualizando dashboard...');
                                updateDashboard();
                            } else {
                                console.log('👨‍💼 ❌ Ignorando mudança de filtro - não estamos na página 2');
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
                        ,onDropdownShow: function(event) {
                            $(this.$select).closest('.filter-item').addClass('filter-active');
                        },
                        onDropdownHide: function(event) {
                            $(this.$select).closest('.filter-item').removeClass('filter-active');
                        }
                    });
                    console.log('👨‍💼 ✅ Multiselect CONSULTOR COMERCIAL reinicializado com sucesso');
                } catch (error) {
                    console.error('👨‍💼 ❌ Erro ao reinicializar multiselect CONSULTOR COMERCIAL:', error);
                }
            }, 100);
            
        } else {
            // Aplicar transição suave apenas se já estiver visível
            if (consultorComercialFilterContainer.style.visibility !== 'hidden') {
                consultorComercialFilterContainer.classList.remove('smooth-showing');
                consultorComercialFilterContainer.classList.add('smooth-hiding');
                setTimeout(() => {
                    consultorComercialFilterContainer.style.display = 'none';
                    consultorComercialFilterContainer.style.visibility = 'hidden';
                }, 300);
            } else {
                // Ocultar imediatamente se já estiver oculto
                consultorComercialFilterContainer.style.display = 'none';
                consultorComercialFilterContainer.style.visibility = 'hidden';
            }
            console.log('👨‍💼 ✅ CONSULTOR COMERCIAL FORÇADO PARA OCULTO');
        }
    } else {
        console.log('👨‍💼 ❌ consultorComercialFilterContainer não encontrado');
    }
}

// 🆕 Função para controlar visibilidade do filtro Indicação Adesão (só página 2)
function applyIndicacaoAdesaoFilterVisibility() {
    const indicacaoAdesaoFilterContainer = document.getElementById('indicacao-adesao-filter-container');
    
    if (indicacaoAdesaoFilterContainer) {
        const currentActivePage = document.getElementById('btn-page2')?.classList.contains('active') ? 'page2' : 'other';
        
        if (currentActivePage === 'page2') {
            // Mostrar sem transição na inicialização, com transição na navegação
            indicacaoAdesaoFilterContainer.style.display = 'block';
            indicacaoAdesaoFilterContainer.style.visibility = 'visible';
            
            // Aplicar transição suave apenas se estivermos navegando
            if (indicacaoAdesaoFilterContainer.classList.contains('smooth-hiding')) {
                indicacaoAdesaoFilterContainer.classList.remove('smooth-hiding');
                indicacaoAdesaoFilterContainer.classList.add('smooth-showing');
            }
            
            console.log('📌 ✅ INDICAÇÃO ADESÃO mostrado para página 2');
            
            const indicacaoAdesaoFilter = $('#indicacao-adesao-filter');
            
            // População baseada apenas em ADESÕES
            setTimeout(() => {
                const indicacoesAdesao = new Set();
                
                // Buscar dados de ADESÕES
                if (allData && allData.length > 0) {
                    allData.forEach(d => {
                        if (d.indicado_por && d.indicado_por !== 'N/A' && d.indicado_por.trim() !== '') {
                            indicacoesAdesao.add(d.indicado_por.trim().toUpperCase());
                        }
                    });
                    console.log('📌 Indicações de adesão encontradas em ADESÕES:', indicacoesAdesao.size);
                }
                
                if (indicacoesAdesao.size > 0) {
                    indicacaoAdesaoFilter.empty();
                    
                    const indicacoesUnicas = [...indicacoesAdesao].sort();
                    console.log('📌 Indicações Adesão ÚNICAS encontradas:', indicacoesUnicas);
                    
                    indicacoesUnicas.forEach((i) => {
                        indicacaoAdesaoFilter.append($("<option>", { value: i, text: i }));
                        console.log('📌 Adicionando opção Indicação Adesão:', i);
                    });
                } else {
                    console.log('📌 ❌ Nenhuma indicação de adesão encontrada');
                }
            }, 50);
            
            // Reinicializar multiselect
            setTimeout(() => {
                console.log('📌 Reinicializando multiselect do INDICAÇÃO ADESÃO...');
                try {
                    if (indicacaoAdesaoFilter.data('multiselect')) {
                        indicacaoAdesaoFilter.multiselect('destroy');
                    }
                    
                    indicacaoAdesaoFilter.multiselect({
                        includeSelectAllOption: true,
                        selectAllText: "Marcar todos",
                        allSelectedText: "Todas as indicações",
                        nonSelectedText: "Todas as indicações",
                        enableFiltering: true,  // ✅ ADICIONAR caixa de pesquisa
                        filterPlaceholder: "Pesquisar indicações...",  // ✅ Placeholder da pesquisa
                        buttonWidth: '100%',
                        maxHeight: 300,
                        numberDisplayed: 2,
                        onChange: function(option, checked) {
                            console.log('📌 Indicação Adesão filter changed:', option, 'checked:', checked);
                            const currentPage = document.getElementById('btn-page2')?.classList.contains('active') ? 'page2' : 'other';
                            if (currentPage === 'page2') {
                                console.log('📌 ✅ Atualizando dashboard...');
                                updateDashboard();
                            } else {
                                console.log('📌 ❌ Ignorando mudança de filtro - não estamos na página 2');
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
                        ,onDropdownShow: function(event) {
                            $(this.$select).closest('.filter-item').addClass('filter-active');
                        },
                        onDropdownHide: function(event) {
                            $(this.$select).closest('.filter-item').removeClass('filter-active');
                        }
                    });
                    console.log('📌 ✅ Multiselect INDICAÇÃO ADESÃO reinicializado com sucesso');
                } catch (error) {
                    console.error('📌 ❌ Erro ao reinicializar multiselect INDICAÇÃO ADESÃO:', error);
                }
            }, 100);
            
        } else {
            // Aplicar transição suave apenas se já estiver visível
            if (indicacaoAdesaoFilterContainer.style.visibility !== 'hidden') {
                indicacaoAdesaoFilterContainer.classList.remove('smooth-showing');
                indicacaoAdesaoFilterContainer.classList.add('smooth-hiding');
                setTimeout(() => {
                    indicacaoAdesaoFilterContainer.style.display = 'none';
                    indicacaoAdesaoFilterContainer.style.visibility = 'hidden';
                }, 300);
            } else {
                // Ocultar imediatamente se já estiver oculto
                indicacaoAdesaoFilterContainer.style.display = 'none';
                indicacaoAdesaoFilterContainer.style.visibility = 'hidden';
            }
            console.log('📌 ✅ INDICAÇÃO ADESÃO FORÇADO PARA OCULTO');
        }
    } else {
        console.log('📌 ❌ indicacaoAdesaoFilterContainer não encontrado');
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
                        ,onDropdownShow: function(event) {
                            $(this.$select).closest('.filter-item').addClass('filter-active');
                        },
                        onDropdownHide: function(event) {
                            $(this.$select).closest('.filter-item').removeClass('filter-active');
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
        ...multiselectDefaultConfig,
        nonSelectedText: "Todos os cursos",
        nSelectedText: "cursos",
        allSelectedText: "Todos selecionados",
        onChange: updateDashboard,
        onSelectAll: updateDashboard,
        onDeselectAll: updateDashboard,
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
            ...multiselectDefaultConfig,
            nonSelectedText: "Todos os consultores",
            nSelectedText: "consultores",
            allSelectedText: "Todos selecionados",
            onChange: updateDashboard,
            onSelectAll: updateDashboard,
            onDeselectAll: updateDashboard,
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
            ...multiselectDefaultConfig,
            nonSelectedText: "Todas as origens",
            nSelectedText: "origens",
            allSelectedText: "Todas selecionadas",
            onChange: updateDashboard,
            onSelectAll: updateDashboard,
            onDeselectAll: updateDashboard,
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
            ...multiselectDefaultConfig,
            nonSelectedText: "Todas as segmentações",
            nSelectedText: "segmentações",
            allSelectedText: "Todas selecionadas",
            onChange: updateDashboard,
            onSelectAll: updateDashboard,
            onDeselectAll: updateDashboard,
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
            ...multiselectDefaultConfig,
            nonSelectedText: "Todas as etiquetas",
            nSelectedText: "etiquetas",
            allSelectedText: "Todas selecionadas",
            onChange: updateDashboard,
            onSelectAll: updateDashboard,
            onDeselectAll: updateDashboard,
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
            ...multiselectDefaultConfig,
            nonSelectedText: "Todos os fundos",
            nSelectedText: "fundos",
            allSelectedText: "Todos selecionados",
            onChange: updateDashboard,
            onSelectAll: updateDashboard,
            onDeselectAll: updateDashboard,
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
        
        // Incluir unidades que só existem nas metas
        const unidadesMetas = Array.from(metasData.keys()).map(key => key.split("-")[0]);
        
        // Combina TODAS as unidades: vendas, fundos, funil E metas
        const unidades = [...new Set([...unidadesVendas, ...unidadesFundos, ...unidadesFunil, ...unidadesMetas])].sort();
        
        if (isFunilPage && funilData && funilData.some(item => item.nm_unidade === 'Sem unidade') && !unidades.includes('Sem unidade')) {
            unidades.push('Sem unidade');
            unidades.sort();
        }
        
        // CORREÇÃO: Determinar quais unidades devem estar selecionadas
        const unidadesToSelect = selectedUnidades.length > 0 ? selectedUnidades : unidades;
        console.log('🎯 Unidades a serem selecionadas:', unidadesToSelect);
        
        unidades.forEach((u) => {
            // Só seleciona a unidade se ela estiver na lista de unidades para seleção
            const shouldSelect = unidadesToSelect.includes(u);
            unidadeFilter.append($("<option>", { 
                value: u, 
                text: u,
                selected: shouldSelect
            }));
        });

        // Cria a lista de acesso rápido
        createUnidadeQuickList(unidades);

        // Filtra os dados com base nas unidades selecionadas
        const unidadesFiltradas = unidadesToSelect;
        
        const dadosFiltrados = allData.filter(d => unidadesFiltradas.includes(d.nm_unidade));
        const fundosFiltrados = fundosData.filter(d => unidadesFiltradas.includes(d.nm_unidade));
        

        
        // Só filtrar dados do funil se estivermos na página do funil E se houver dados do funil
        let funilFiltrado = [];
        if (isFunilPage && funilData && funilData.length > 0) {
            // Primeiro filtra por unidade
            let baseFiltrado = funilData.filter(d => unidadesFiltradas.includes(d.nm_unidade));
            // Em seguida filtra por período usando a coluna 'criado_em' (coluna M)
            const startDateString = document.getElementById("start-date").value;
            const endDateString = document.getElementById("end-date").value;
            let startDate = null, endDate = null;
            try {
                if (startDateString && endDateString) {
                    const [sy, sm, sd] = startDateString.split('-').map(Number);
                    startDate = new Date(sy, sm - 1, sd);
                    const [ey, em, ed] = endDateString.split('-').map(Number);
                    endDate = new Date(ey, em - 1, ed);
                    endDate.setDate(endDate.getDate() + 1);
                }
            } catch (e) { startDate = null; endDate = null; }

            funilFiltrado = baseFiltrado.filter(item => {
                if (!startDate || !endDate) return true; // se não tem período definido, não filtra por data
                let criado = item.criado_em || (item.row_data && item.row_data[12]) || item.criado_em;
                let criadoDate = null;
                if (criado instanceof Date) criadoDate = criado;
                else if (typeof criado === 'string') {
                    const parts = criado.match(/(\d{2})\/(\d{2})\/(\d{4})/);
                    if (parts) criadoDate = new Date(parts[3], parts[2]-1, parts[1]);
                    else criadoDate = new Date(criado);
                }
                return criadoDate && criadoDate >= startDate && criadoDate < endDate;
            });

            // Atualiza a tabela de captações baseada na base de funil filtrada
            try { updateCaptacoesFunilTable(funilFiltrado); } catch(e) { console.error('Erro ao atualizar captacoes funil table:', e); }
        }

        // Populate cursos filter baseado na página atual
        let cursos = [];
        if (isFunilPage) {
            // Para página do funil, usar coluna D do funil (Qual é o seu curso?)
            const cursosFunil = funilFiltrado.map((d) => d.curso || '').filter(c => c && c.trim() !== '' && c !== 'N/A');
            cursos = [...new Set(cursosFunil)].sort();
        } else {
            // Para outras páginas, usar dados de vendas e fundos
            const cursosVendas = dadosFiltrados.map((d) => d.curso_fundo || '').filter(c => c && c !== 'N/A');
            const cursosFundos = fundosFiltrados.map((d) => d.curso_fundo || '').filter(c => c && c !== 'N/A');
            cursos = [...new Set([...cursosVendas, ...cursosFundos])].sort();
        }
        
        cursos.forEach((c) => {
            cursoFilter.append($("<option>", { value: c, text: c }));
        });

        // Populate consultores filter (apenas se for página do funil)
        if (isFunilPage && funilFiltrado.length > 0) {
            const consultoresFunil = funilFiltrado.map((d) => d.consultor || '').filter(c => c && c.trim() !== '' && c !== 'N/A');
            const consultores = [...new Set(consultoresFunil)].sort();
            
            consultores.forEach((c) => {
                consultorFilter.append($("<option>", { value: c, text: c }));
            });
        }

        // Populate origem do lead filter (apenas se for página do funil)
        if (isFunilPage && funilFiltrado.length > 0) {
            const origemLeadFunil = funilFiltrado.map((d) => d.origem_lead || '').filter(o => o && o.trim() !== '' && o !== 'N/A');
            const origensLead = [...new Set(origemLeadFunil)].sort();
            
            origensLead.forEach((o) => {
                origemLeadFilter.append($("<option>", { value: o, text: o }));
            });

            // Populate segmentacao lead filter (apenas se for página do funil)
            const segmentacaoLeadFunil = funilFiltrado.map((d) => d.segmentacao_lead || '').filter(s => s && s.trim() !== '' && s !== 'N/A');
            const segmentacoesLead = [...new Set(segmentacaoLeadFunil)].sort();
            
            segmentacoesLead.forEach((s) => {
                segmentacaoLeadFilter.append($("<option>", { value: s, text: s }));
            });

            // Populate etiquetas filter (apenas se for página do funil)
            const etiquetasFunil = funilFiltrado.map((d) => d.etiquetas || '').filter(e => e && e.trim() !== '' && e !== 'N/A');
            const etiquetas = [...new Set(etiquetasFunil)].sort();
            
            etiquetas.forEach((e) => {
                etiquetasFilter.append($("<option>", { value: e, text: e }));
            });
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
                    allSelectedText: "Todas",
                    buttonWidth: "100%",
                    maxHeight: 300,
                    onChange: function(option, checked) {
                        // Limpar a seleção do filtro rápido quando há alteração manual
                        if (lastQuickFilterSelection) {
                            console.log('🔧 Limpando filtro rápido devido à seleção manual');
                            lastQuickFilterSelection = null;
                        }
                        updateDashboard();
                    },
                    onSelectAll: function() {
                        // Limpar a seleção do filtro rápido quando há seleção manual de todos
                        if (lastQuickFilterSelection) {
                            console.log('🔧 Limpando filtro rápido devido ao "Selecionar Todos"');
                            lastQuickFilterSelection = null;
                        }
                        updateDashboard();
                    },
                    onDeselectAll: function() {
                        // Limpar a seleção do filtro rápido quando há deseleção manual de todos
                        if (lastQuickFilterSelection) {
                            console.log('🔧 Limpando filtro rápido devido ao "Desselecionar Todos"');
                            lastQuickFilterSelection = null;
                        }
                        updateDashboard();
                    },
                    onDropdownShow: function(event) {
                        $(this.$select).closest('.filter-item').addClass('filter-item-active');
                        
                        // Fechar o filtro rápido se estiver aberto
                        const quickPanel = document.getElementById('unidade-quick-panel');
                        if (quickPanel && quickPanel.classList.contains('active')) {
                            closeUnidadeQuickPanel();
                            console.log('🔄 Fechando filtro rápido de unidades');
                        }
                    },
                    onDropdownHide: function(event) {
                        $(this.$select).closest('.filter-item').removeClass('filter-item-active');
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
                
                // CORREÇÃO: Aplicar as seleções corretas após inicialização
                console.log('🔧 Aplicando seleções após inicialização multiselect:');
                console.log('  - currentSelectedValues:', currentSelectedValues);
                console.log('  - selectedUnidades:', selectedUnidades);
                console.log('  - unidadesToSelect:', unidadesToSelect);
                
                // Se há seleções específicas, aplicá-las. Caso contrário, manter como está.
                if (selectedUnidades.length > 0) {
                    unidadeFilter.multiselect('deselectAll', false);
                    unidadeFilter.multiselect('select', selectedUnidades);
                    console.log('  - ✅ Seleções específicas aplicadas:', selectedUnidades);
                } else if (currentSelectedValues.length > 0) {
                    unidadeFilter.multiselect('select', currentSelectedValues);
                    console.log('  - ✅ Seleções anteriores restauradas:', currentSelectedValues);
                }

                unidadeFilter.multiselect('refresh');
            } catch (error) {
                console.error('Erro ao inicializar multiselect de unidades:', error);
            }

            // CURSOS
            try {
                // Destruir multiselect existente de curso
                try {
                    if (cursoFilter.data('multiselect')) {
                        cursoFilter.multiselect('destroy');
                    }
                } catch (e) {
                    // Silencioso
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
                    onDropdownShow: function(event) {
                        $(this.$select).closest('.filter-item').addClass('filter-item-active');
                    },
                    onDropdownHide: function(event) {
                        $(this.$select).closest('.filter-item').removeClass('filter-item-active');
                    },
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
                        onDropdownShow: function(event) {
                            $(this.$select).closest('.filter-item').addClass('filter-item-active');
                        },
                        onDropdownHide: function(event) {
                            $(this.$select).closest('.filter-item').removeClass('filter-item-active');
                        },
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
                        onDropdownShow: function(event) {
                            $(this.$select).closest('.filter-item').addClass('filter-item-active');
                        },
                        onDropdownHide: function(event) {
                            $(this.$select).closest('.filter-item').removeClass('filter-item-active');
                        },
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
                        onDropdownShow: function(event) {
                            $(this.$select).closest('.filter-item').addClass('filter-item-active');
                        },
                        onDropdownHide: function(event) {
                            $(this.$select).closest('.filter-item').removeClass('filter-item-active');
                        },
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
                        onDropdownShow: function(event) {
                            $(this.$select).closest('.filter-item').addClass('filter-item-active');
                        },
                        onDropdownHide: function(event) {
                            $(this.$select).closest('.filter-item').removeClass('filter-item-active');
                        },
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
                        onDropdownShow: function(event) {
                            $(this.$select).closest('.filter-item').addClass('filter-item-active');
                        },
                        onDropdownHide: function(event) {
                            $(this.$select).closest('.filter-item').removeClass('filter-item-active');
                        },
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

    // ✅ CORREÇÃO: Define as datas padrão APENAS se ainda não foram definidas
    const startDateEl = document.getElementById("start-date");
    const endDateEl = document.getElementById("end-date");
    
    if (!startDateEl.value || !endDateEl.value) {
        console.log('🗓️ Definindo datas padrão (primeira inicialização)');
        const hoje = new Date();
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        startDateEl.value = inicioMes.toISOString().split("T")[0];
        endDateEl.value = fimMes.toISOString().split("T")[0];
    } else {
        console.log('🗓️ Mantendo datas existentes:', startDateEl.value, 'até', endDateEl.value);
    }
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

    // Gera uma paleta monotônica do cinza (#6c757d) até o laranja padrão (#FF6600)
    function hexToRgb(hex) {
        const m = hex.replace('#','');
        return [parseInt(m.substring(0,2),16), parseInt(m.substring(2,4),16), parseInt(m.substring(4,6),16)];
    }
    function rgbToHex(r,g,b){
        return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
    }
    function generateThreeStopScale(startHex, midHex, endHex, steps){
        // If only 1 step, return the end color (more visible)
        if (steps <= 1) return [endHex];
        const start = hexToRgb(startHex);
        const mid = hexToRgb(midHex);
        const end = hexToRgb(endHex);
        const out = [];
        for(let i=0;i<steps;i++){
            const t = i/(steps-1);
            // decide se estamos na metade inferior ou superior
            if (t <= 0.5) {
                const localT = t / 0.5; // 0..1
                const r = Math.round(start[0] + (mid[0]-start[0]) * localT);
                const g = Math.round(start[1] + (mid[1]-start[1]) * localT);
                const b = Math.round(start[2] + (mid[2]-start[2]) * localT);
                out.push(rgbToHex(r,g,b));
            } else {
                const localT = (t-0.5) / 0.5; // 0..1
                const r = Math.round(mid[0] + (end[0]-mid[0]) * localT);
                const g = Math.round(mid[1] + (end[1]-mid[1]) * localT);
                const b = Math.round(mid[2] + (end[2]-mid[2]) * localT);
                out.push(rgbToHex(r,g,b));
            }
        }
        return out;
    }

    const baseGray = '#6c757d';
    // Amarelo intermediário mais saturado para melhor contraste
    const midYellow = '#FFB300';
    const baseOrange = '#FF6600';
    const palette = generateThreeStopScale(baseGray, midYellow, baseOrange, uniqueYears.length || 1);

    const datasets = uniqueYears.map((year, index) => ({
        label: year,
        data: adesoesByYearMonth[year] || Array(12).fill(0),
        legendColor: palette[index % palette.length],
        backgroundColor: function(context) {
            const chart = context.chart;
            const {ctx, chartArea} = chart;
            const baseColor = palette[index % palette.length];
            // Funções utilitárias para clarear/escurecer cor
            function hexToRgb(hex) {
                const m = hex.replace('#','');
                return [parseInt(m.substring(0,2),16), parseInt(m.substring(2,4),16), parseInt(m.substring(4,6),16)];
            }
            function rgbToHex(r,g,b){
                return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
            }
            function lighten(color, percent) {
                const [r,g,b] = hexToRgb(color);
                return rgbToHex(
                    Math.min(255, Math.round(r + (255 - r) * percent / 100)),
                    Math.min(255, Math.round(g + (255 - g) * percent / 100)),
                    Math.min(255, Math.round(b + (255 - b) * percent / 100))
                );
            }
            function darken(color, percent) {
                const [r,g,b] = hexToRgb(color);
                return rgbToHex(
                    Math.max(0, Math.round(r * (1 - percent / 100))),
                    Math.max(0, Math.round(g * (1 - percent / 100))),
                    Math.max(0, Math.round(b * (1 - percent / 100)))
                );
            }
            if (!chartArea) {
                return baseColor;
            }
            // Gradiente vertical: cima para baixo, usando tons derivados da cor base
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, lighten(baseColor, 30)); // Mais claro no topo
            gradient.addColorStop(0.5, baseColor); // Cor base no meio
            gradient.addColorStop(1, darken(baseColor, 25)); // Mais escuro na base
            return gradient;
        },
        hidden: !activeYears.includes(parseInt(year)),
        barPercentage: 0.8,
        categoryPercentage: 0.8
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
                    displayColors: true,
                    usePointStyle: true,
                    padding: 12,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    titleFont: { family: 'Poppins, Arial, sans-serif', size: 16, weight: '600' },
                    bodyFont: { family: 'Poppins, Arial, sans-serif', size: 18, weight: '700' },
                    footerFont: { family: 'Poppins, Arial, sans-serif', size: 16, weight: '600' },
                    cornerRadius: 6,
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
                    display: true,
                    align: "center",
                    anchor: "center",
                    color: "#FFFFFF",
                    font: { family: 'Poppins, Arial, sans-serif', size: 16, weight: "700" },
                    formatter: (value) => {
                        if (!value || value === 0) return "";
                        const num = Number(value);
                        if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1).replace('.0','') + ' mi';
                        if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1).replace('.0','') + 'k';
                        return num.toString();
                    },
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: { family: 'Poppins, Arial, sans-serif', size: 16 },
                        color: '#adb5bd',
                        callback: function (value) {
                            const num = Number(value);
                            if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1).replace('.0','') + ' mi';
                            if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1).replace('.0','') + 'k';
                            return num;
                        }
                    },
                    grid: { color: 'rgba(255,255,255,0.04)' },
                },
                x: {
                    ticks: { font: { family: 'Poppins, Arial, sans-serif', size: 16 }, color: '#adb5bd' },
                    grid: { color: 'rgba(255,255,255,0.04)' },
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
                {
                    label: "Pós Venda",
                    data: adesoesPosVendasAnual,
                    // ✅ CORREÇÃO 1: Adiciona a cor sólida para a legenda
                    legendColor: '#6c757d',
                    // ✅ CORREÇÃO 2: Novo gradiente para a barra com melhor contraste
                    backgroundColor: function(context) {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        if (!chartArea) {
                            return '#6c757d'; // Fallback
                        }
                        const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
                        // Novo gradiente que evita o branco e tem bom contraste
                        gradient.addColorStop(0, '#ADB5BD'); // Cinza mais claro na esquerda
                        gradient.addColorStop(1, '#495057'); // Cinza mais escuro na direita
                        return gradient;
                    }
                },
                {
                    label: "Venda",
                    data: adesoesVendasAnual,
                    legendColor: '#FF6600',
                    backgroundColor: function(context) {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        if (!chartArea) {
                            return '#FF6600';
                        }
                        const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
                        gradient.addColorStop(0, '#e65500');
                        gradient.addColorStop(0.5, '#FF6600');
                        gradient.addColorStop(1, '#ff8a33');
                        return gradient;
                    }
                },
            ],
        },
        options: {
            plugins: {
                legend: {
                    labels: {
                        generateLabels: function(chart) {
                            const datasets = chart.data.datasets;
                            return datasets.map((ds, i) => {
                                let fillStyle = '#ADB5BD';
                                if (ds.label === 'Venda') fillStyle = '#FF6600';
                                if (ds.label === 'Pós Venda') fillStyle = '#ADB5BD';
                                return {
                                    text: (ds.label || '').toString().toUpperCase(),
                                    fillStyle: fillStyle,
                                    hidden: !!ds.hidden,
                                    lineCap: ds.borderCapStyle || 'butt',
                                    lineDash: ds.borderDash || [],
                                    lineDashOffset: ds.borderDashOffset || 0,
                                    lineJoin: ds.borderJoinStyle || 'miter',
                                    fontColor: '#F8F9FA',
                                    lineWidth: ds.borderWidth || 0,
                                    strokeStyle: ds.borderColor || 'transparent',
                                    datasetIndex: i,
                                    pointStyle: ds.pointStyle || 'rect',
                                    pointRadius: ds.pointRadius || 5,
                                    boxWidth: 20,
                                    boxHeight: 10
                                };
                            });
                        }
                    }
                }
            },
            devicePixelRatio: window.devicePixelRatio,
            interaction: { mode: "y", intersect: false },
            maintainAspectRatio: false,
            indexAxis: "y",
            scales: {
                x: {
                    stacked: true,
                    ticks: {
                        font: { family: 'Poppins, Arial, sans-serif', size: 16 },
                        color: '#adb5bd',
                        callback: function(value) {
                            const num = Number(value);
                            if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1).replace('.0','') + ' mi';
                            if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1).replace('.0','') + 'k';
                            return num.toString();
                        }
                    },
                    grid: { color: 'rgba(255,255,255,0.04)' },
                },
                y: {
                    stacked: true,
                    ticks: { font: { family: 'Poppins, Arial, sans-serif', size: 16 }, color: '#adb5bd' }
                }
            },
            plugins: {
                datalabels: {
                    color: function(context) {
                        // Usa texto escuro para o 'Pós Venda' para contrastar com a parte clara do gradiente
                        if (context.dataset.label === 'Pós Venda') {
                            return '#212529'; 
                        }
                        // Usa texto branco para a 'Venda'
                        return '#FFFFFF';
                    },
                    font: { family: 'Poppins, Arial, sans-serif', size: 16, weight: '700' },
                    formatter: (value) => {
                        if (!value || value === 0) return "";
                        const num = Number(value);
                        if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1).replace('.0','') + ' mi';
                        if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1).replace('.0','') + 'k';
                        return num.toString();
                    },
                },
                tooltip: {
                    displayColors: true,
                    usePointStyle: true,
                    padding: 12,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    titleFont: { family: 'Poppins, Arial, sans-serif', size: 16, weight: '600' },
                    bodyFont: { family: 'Poppins, Arial, sans-serif', size: 18, weight: '700' },
                    footerFont: { family: 'Poppins, Arial, sans-serif', size: 16, weight: '600' },
                    cornerRadius: 6,
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || "";
                            if (label) { label += ": "; }
                            const v = context.parsed.x;
                            if (v !== null && v !== undefined) {
                                const num = Number(v);
                                label += num.toLocaleString('pt-BR');
                            }
                            return label;
                        },
                        footer: function (tooltipItems) {
                            let sum = tooltipItems.reduce((acc, item) => acc + item.parsed.x, 0);
                            return 'Total: ' + sum.toLocaleString('pt-BR');
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
    document.getElementById("monthly-adesoes-stacked-title").textContent = `ADESÕES POR TIPO MENSAL (${year})`;
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
                {
                    label: "Pós Venda",
                    data: adesoesPosVendasMensal,
                    backgroundColor: function(context) {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        if (!chartArea) {
                            return '#6c757d';
                        }
                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        gradient.addColorStop(0, '#E9ECEF');
                        gradient.addColorStop(0.5, '#ADB5BD');
                        gradient.addColorStop(1, '#6c757d');
                        return gradient;
                    }
                },
                {
                    label: "Venda",
                    data: adesoesVendasMensal,
                    backgroundColor: function(context) {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        if (!chartArea) {
                            return '#FF6600';
                        }
                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        gradient.addColorStop(0, '#ff8a33');
                        gradient.addColorStop(0.5, '#FF6600');
                        gradient.addColorStop(1, '#e65500');
                        return gradient;
                    }
                },
            ],
        },
        options: {
            plugins: {
                legend: {
                    labels: {
                        generateLabels: function(chart) {
                            const datasets = chart.data.datasets;
                            return datasets.map((ds, i) => {
                                let fillStyle = '#ADB5BD';
                                if (ds.label === 'Venda') fillStyle = '#FF6600';
                                if (ds.label === 'Pós Venda') fillStyle = '#ADB5BD';
                                return {
                                    text: (ds.label || '').toString().toUpperCase(),
                                    fillStyle: fillStyle,
                                    hidden: !!ds.hidden,
                                    lineCap: ds.borderCapStyle || 'butt',
                                    lineDash: ds.borderDash || [],
                                    lineDashOffset: ds.borderDashOffset || 0,
                                    lineJoin: ds.borderJoinStyle || 'miter',
                                    fontColor: '#F8F9FA',
                                    lineWidth: ds.borderWidth || 0,
                                    strokeStyle: ds.borderColor || 'transparent',
                                    datasetIndex: i,
                                    pointStyle: ds.pointStyle || 'rect',
                                    pointRadius: ds.pointRadius || 5,
                                    boxWidth: 20,
                                    boxHeight: 10
                                };
                            });
                        }
                    }
                }
            },
            devicePixelRatio: window.devicePixelRatio,
            interaction: { mode: "index", intersect: false },
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    ticks: { font: { family: 'Poppins, Arial, sans-serif', size: 16 }, color: '#adb5bd' },
                    grid: { color: 'rgba(255,255,255,0.04)' },
                },
                y: {
                    stacked: true,
                    ticks: {
                        font: { family: 'Poppins, Arial, sans-serif', size: 16 },
                        color: '#adb5bd',
                        callback: function(value) {
                            const num = Number(value);
                            if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1).replace('.0','') + ' mi';
                            if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1).replace('.0','') + 'k';
                            return num;
                        }
                    },
                    grid: { color: 'rgba(255,255,255,0.04)' },
                }
            },
            plugins: {
                datalabels: {
                    display: true,
                    color: function(context) {
                        if (context.dataset.label === 'Pós Venda') {
                            return '#212529'; // Escuro para contraste no cinza
                        }
                        return '#FFFFFF'; // Branco para laranja
                    },
                    align: "center",
                    anchor: "center",
                    clip: true,
                    font: { family: 'Poppins, Arial, sans-serif', size: 16, weight: '700' },
                    formatter: (value) => {
                        if (!value || value === 0) return "";
                        const num = Number(value);
                        if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1).replace('.0','') + 'k';
                        return num.toString();
                    },
                },
                tooltip: {
                    displayColors: true,
                    usePointStyle: true,
                    padding: 12,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    titleFont: { family: 'Poppins, Arial, sans-serif', size: 16, weight: '600' },
                    bodyFont: { family: 'Poppins, Arial, sans-serif', size: 18, weight: '700' },
                    footerFont: { family: 'Poppins, Arial, sans-serif', size: 16, weight: '600' },
                    cornerRadius: 6,
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || "";
                            if (label) { label += ": "; }
                            const v = context.parsed.y;
                            if (v !== null && v !== undefined) {
                                const num = Number(v);
                                // show integer in tooltip but keep pt-BR formatting
                                label += num.toLocaleString('pt-BR');
                            }
                            return label;
                        },
                        footer: function (tooltipItems) {
                            let sum = tooltipItems.reduce((acc, item) => acc + item.parsed.y, 0);
                            return 'Total: ' + sum.toLocaleString('pt-BR');
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
            language: {
                sEmptyTable: "Nenhum registro disponível na tabela",
                sInfo: "Mostrando _START_ a _END_ de _TOTAL_ entradas",
                sInfoEmpty: "Mostrando 0 a 0 de 0 entradas",
                sInfoFiltered: "(filtrado de _MAX_ registros no total)",
                sLengthMenu: "Mostrar _MENU_ entradas",
                sLoadingRecords: "Carregando...",
                sProcessing: "Processando...",
                sSearch: "Pesquisar:",
                sZeroRecords: "Nenhum registro encontrado",
                oPaginate: { sFirst: "Primeiro", sPrevious: "Anterior", sNext: "Próximo", sLast: "Último" },
                oAria: { sSortAscending: ": ativar para ordenar a coluna de forma ascendente", sSortDescending: ": ativar para ordenar a coluna de forma descendente" }
            },
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
            language: {
                sEmptyTable: "Nenhum registro disponível na tabela",
                sInfo: "Mostrando _START_ a _END_ de _TOTAL_ entradas",
                sInfoEmpty: "Mostrando 0 a 0 de 0 entradas",
                sInfoFiltered: "(filtrado de _MAX_ registros no total)",
                sLengthMenu: "Mostrar _MENU_ entradas",
                sLoadingRecords: "Carregando...",
                sProcessing: "Processando...",
                sSearch: "Pesquisar:",
                sZeroRecords: "Nenhum registro encontrado",
                oPaginate: { sFirst: "Primeiro", sPrevious: "Anterior", sNext: "Próximo", sLast: "Último" },
                oAria: { sSortAscending: ": ativar para ordenar a coluna de forma ascendente", sSortDescending: ": ativar para ordenar a coluna de forma descendente" }
            },
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
            language: {
                sEmptyTable: "Nenhum registro disponível na tabela",
                sInfo: "Mostrando _START_ a _END_ de _TOTAL_ entradas",
                sInfoEmpty: "Mostrando 0 a 0 de 0 entradas",
                sInfoFiltered: "(filtrado de _MAX_ registros no total)",
                sLengthMenu: "Mostrar _MENU_ entradas",
                sLoadingRecords: "Carregando...",
                sProcessing: "Processando...",
                sSearch: "Pesquisar:",
                sZeroRecords: "Nenhum registro encontrado",
                oPaginate: { sFirst: "Primeiro", sPrevious: "Anterior", sNext: "Próximo", sLast: "Último" },
                oAria: { sSortAscending: ": ativar para ordenar a coluna de forma ascendente", sSortDescending: ": ativar para ordenar a coluna de forma descendente" }
            },
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
    // Render 100% stacked bar instead of doughnut
    updateCaptacoesStackedBar(dadosGrafico);
    
    console.log("=== FIM updateCaptacoes ===");
}

// Função para atualizar a tabela de captações
// DataTable instance for captacoes
let captacoesDataTable = null;

// Função para atualizar a tabela de captações usando DataTables (mantém estilo consistente com outros relatórios)
function updateCaptacoesTable(dados) {
    // Verificar se o elemento da tabela existe
    const tableEl = document.getElementById('captacoes-funil-table');
    if (!tableEl) {
        console.error("❌ Elemento 'captacoes-funil-table' não encontrado");
        return;
    }

    // Preparar linhas para DataTable
    const rows = dados.map(item => [
        item.origem,
        item.tipo,
        `${item.percentual}%`,
        item.total
    ]);

    // Se já existe, apenas recarrega os dados
    if (captacoesDataTable) {
        captacoesDataTable.clear().rows.add(rows).draw();
        // Atualizar footer manualmente
        updateCaptacoesFooter(dados);
        return;
    }

    // Inicializa DataTable com opções e botão de exportação, linguagem pt-BR
    captacoesDataTable = $("#captacoes-funil-table").DataTable({
        data: rows,
        columns: [
            { title: "Origem do Lead" },
            { title: "Tipo de captação" },
            { title: "%" },
            { title: "TOTAL" },
        ],
        pageLength: 10,
        language: {
            sEmptyTable: "Nenhum registro disponível na tabela",
            sInfo: "Mostrando _START_ a _END_ de _TOTAL_ entradas",
            sInfoEmpty: "Mostrando 0 a 0 de 0 entradas",
            sInfoFiltered: "(filtrado de _MAX_ registros no total)",
            sLengthMenu: "Mostrar _MENU_ entradas",
            sLoadingRecords: "Carregando...",
            sProcessing: "Processando...",
            sSearch: "Pesquisar:",
            sZeroRecords: "Nenhum registro encontrado",
            oPaginate: { sFirst: "Primeiro", sPrevious: "Anterior", sNext: "Próximo", sLast: "Último" },
            oAria: { sSortAscending: ": ativar para ordenar a coluna de forma ascendente", sSortDescending: ": ativar para ordenar a coluna de forma descendente" }
        },
        destroy: true,
        dom: "Bfrtip",
        buttons: [{
            extend: "excelHtml5", text: "Exportar para Excel", title: `Relatorio_Captacoes_${new Date().toLocaleDateString("pt-BR")}`, className: "excel-button",
            exportOptions: {
                format: {
                    body: function (data, row, column, node) {
                        // Remove formatting to export raw numbers for TOTAL
                        if (column === 3) { return Number(String(data).replace(/[^0-9\-\.]/g, '')) || 0; }
                        return data;
                    }
                }
            }
        }],
        createdRow: function(row, data, dataIndex) {
            // no heatmap classes — keep neutral rows like the Fundos/Consultor table
            $(row).find('td').css({ 'text-align': 'center' });
            $(row).find('td:first-child').css({ 'text-align': 'left' });
            $(row).find('td:nth-child(2)').css({ 'text-align': 'left' });
        }
    });

    // Atualizar footer
    updateCaptacoesFooter(dados);
}

// Atualiza o conteúdo do tfoot com os totais e aplica classes heat conforme thresholds
function updateCaptacoesFooter(dados) {
    const percentuais = dados.map(d => d.percentual);
    const maxPercent = Math.max(...percentuais);
    const minPercent = Math.min(...percentuais);
    const threshold1 = minPercent + (maxPercent - minPercent) * 0.33;
    const threshold2 = minPercent + (maxPercent - minPercent) * 0.66;

    // Atualiza footer valores
    const totalAbsoluto = dados.reduce((s, i) => s + i.total, 0);
    const totalPercentual = dados.reduce((s, i) => s + i.percentual, 0);

    const $tfoot = $('#captacoes-funil-table tfoot tr');
    if ($tfoot.length) {
        $tfoot.find('td').eq(2).text(totalPercentual.toFixed(1) + '%');
        $tfoot.find('td').eq(3).text(totalAbsoluto);

        // No heatmap: keep footer visually highlighted but neutral classes
        $tfoot.find('td').eq(2).css({ 'font-weight': '700', 'color': '#ffc107' });
        $tfoot.find('td').eq(3).css({ 'font-weight': '700', 'color': '#ffc107' });
    }

    // No per-row heatmap assignment — rows remain neutral like other DataTables
}

// Variável global para armazenar a instância do gráfico
let captacoesChartInstance = null;
// DataTable instance for motivos de perda
let motivosPerdaDataTable = null;
// DataTable instance for descartes
let descartesDataTable = null;

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
        type: 'doughnut',
        data: {
            labels: labels, // Sem percentuais na legenda
            datasets: [{
                data: valores,
                backgroundColor: backgroundColor,
                borderColor: '#2b2f31',
                borderWidth: 2,
                hoverOffset: 12,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, /* Permitir que ocupe todo espaço */
            cutout: '45%',
            layout: { padding: { top: 0, bottom: 0, left: 0, right: 180 } },
            plugins: {
                legend: {
                    position: 'right', // Legenda à direita
                    labels: {
                        color: '#F8F9FA', // use white for contrast
                        font: { size: 15, family: 'Poppins, Arial, sans-serif', weight: 600 },
                        padding: 18,
                        usePointStyle: true,
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, index) => {
                                    const dataset = data.datasets[0];
                                    const txt = (label || '').toString().toUpperCase();
                                    return {
                                        text: txt, // Nome do tipo em MAIÚSCULAS
                                        fillStyle: dataset.backgroundColor[index],
                                        strokeStyle: dataset.borderColor,
                                        lineWidth: dataset.borderWidth,
                                        pointStyle: 'circle',
                                        hidden: false,
                                        index: index,
                                        textColor: '#F8F9FA',
                                        font: { family: 'Poppins, Arial, sans-serif', size: 15, weight: '600' }
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
                    color: '#FFFFFF',
                    backgroundColor: 'rgba(0,0,0,0.35)',
                    borderRadius: 6,
                    padding: 6,
                    font: { weight: '700', size: 16, family: 'Poppins, Arial, sans-serif' },
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

// Nova função: cria um gráfico de barras 100% empilhadas (horizontal) com os mesmos dados
let captacoesStackedBarInstance = null;
function updateCaptacoesStackedBar(dados) {
    const ctx = document.getElementById('captacoesStackedBar');
    if (!ctx) {
        console.error("❌ Elemento 'captacoesStackedBar' não encontrado");
        return;
    }

    // destruir instância anterior
    if (captacoesStackedBarInstance) captacoesStackedBarInstance.destroy();

    const cores = [
        '#FFC107', // Amarelo
        '#FF9800', // Laranja
        '#FF5722', // Vermelho
        '#9C27B0', // Roxo
        '#3F51B5', // Azul
        '#009688', // Verde água
        '#4CAF50', // Verde
        '#FFB74D'  // Laranja claro
    ];

    const labels = dados.map(d => d.tipo);
    const valores = dados.map(d => d.total);
    const total = valores.reduce((s, v) => s + v, 0) || 1;
    const percents = valores.map(v => (v / total) * 100);

    // For Chart.js stacked 100% we create one dataset per category with the percentage
    const datasets = valores.map((v, idx) => ({
        label: labels[idx],
        data: [percents[idx]],
        // Gradiente horizontal sutil para cada segmento
        backgroundColor: function(context) {
            const chart = context.chart;
            const {ctx, chartArea} = chart;
            const baseColor = cores[idx % cores.length];
            if (!chartArea) {
                return baseColor; // Fallback
            }
            const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
            const darkerColor = adjustColor(baseColor, -20); // Escurece 20%
            const lighterColor = adjustColor(baseColor, 20); // Clareia 20%
            gradient.addColorStop(0, darkerColor);
            gradient.addColorStop(1, lighterColor);
            return gradient;
        },
        borderColor: '#2b2f31',
        borderWidth: 0
    }));

    captacoesStackedBarInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [''], // single stacked bar
            datasets: datasets
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, display: false, max: 100 },
                y: { stacked: true, display: false }
            },
            plugins: {
                legend: { position: 'bottom', labels: { color: '#F8F9FA', boxWidth: 14, boxHeight: 14, padding: 10, font: { size: 16, family: 'Poppins, Arial, sans-serif', weight: 700 } } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const idx = context.datasetIndex;
                            const item = dados[idx];
                            return `${item.tipo}: ${item.total} leads (${item.percentual}%)`;
                        }
                    }
                },
                datalabels: {
                    display: true,
                    color: '#ffffff',
                    anchor: 'center',
                    align: 'center',
                    clamp: true,
                    formatter: function(value, context) { return `${value.toFixed(1)}%`; },
                    font: { weight: '800', size: 16, family: 'Poppins, Arial, sans-serif' }
                }
            },
            elements: {
                bar: { borderRadius: 6 }
            }
        },
        plugins: [ChartDataLabels]
    });
}

// === NOVA SEÇÃO: LEADS PERDIDOS DETALHADOS ===

// Função para atualizar a tabela de motivos de perda
function updateMotivosPerdaTable(dadosFiltrados) {
    console.log("=== INÍCIO updateMotivosPerdaTable ===");
    console.log("📊 Dados filtrados recebidos:", dadosFiltrados ? dadosFiltrados.length : 0);
    
    const tableEl = document.getElementById('motivos-perda-table');
    if (!tableEl) {
        console.error("❌ Elemento 'motivos-perda-table' não encontrado");
        return;
    }

    const tbody = tableEl.querySelector('tbody');
    if (!tbody) {
        console.error("❌ Elemento tbody da tabela 'motivos-perda-table' não encontrado");
        return;
    }

    // Verificar se há dados do funil disponíveis
    if (!dadosFiltrados || dadosFiltrados.length === 0) {
        console.log("⚠️ Não há dados filtrados para processar motivos de perda");
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #F8F9FA;">Nenhum dado disponível</td></tr>';
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
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #F8F9FA; padding: 20px;">Nenhum motivo de perda encontrado no período selecionado</td></tr>';
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

    // Preparar dados para DataTable
    const tableData = dadosTabela.map(item => [item.motivo, item.percentual + '%', item.total]);

        // Se já existe DataTable, atualiza os dados
        if (motivosPerdaDataTable) {
            motivosPerdaDataTable.clear().rows.add(tableData).draw();
        } else {
            // Inicializar DataTable com configuração similar às outras tabelas (export, paginação, linguagem)
            motivosPerdaDataTable = $("#motivos-perda-table").DataTable({
                data: tableData,
                columns: [
                    { title: 'Motivo de Perda' },
                    { title: '%' },
                    { title: 'Total' }
                ],
                pageLength: 7,
                destroy: true,
                dom: 'Brtip',
                buttons: [{
                    extend: 'excelHtml5',
                    text: 'Exportar para Excel',
                    title: `Relatorio_Motivos_Perda_${new Date().toLocaleDateString('pt-BR')}`,
                    className: 'excel-button',
                    exportOptions: {
                        columns: [0,1,2],
                        format: {
                            body: function(data, row, column, node) {
                                // Remover '%' do valor percentual antes de exportar
                                if (column === 1 && typeof data === 'string') return data.replace('%','');
                                return data;
                            }
                        }
                    }
                }],
                language: {
                    sEmptyTable: 'Nenhum registro disponível na tabela',
                    sInfo: 'Mostrando _START_ a _END_ de _TOTAL_ entradas',
                    sInfoEmpty: 'Mostrando 0 a 0 de 0 entradas',
                    sInfoFiltered: '(filtrado de _MAX_ registros no total)',
                    sLengthMenu: 'Mostrar _MENU_ entradas',
                    sLoadingRecords: 'Carregando...',
                    sProcessing: 'Processando...',
                    sSearch: 'Pesquisar:',
                    sZeroRecords: 'Nenhum registro encontrado',
                    oPaginate: { sFirst: 'Primeiro', sPrevious: 'Anterior', sNext: 'Próximo', sLast: 'Último' },
                    oAria: { sSortAscending: ': ativar para ordenar a coluna de forma ascendente', sSortDescending: ': ativar para ordenar a coluna de forma descendente' }
                },
                createdRow: function(row, data, dataIndex) {
                    // Alinhar a primeira coluna à esquerda (motivo) e as demais ao centro
                    $(row).find('td').css({ 'text-align': 'center' });
                    $(row).find('td:first-child').css({ 'text-align': 'left' });
                    $(row).find('td:nth-child(2)').css({ 'text-align': 'left' });
                },
                autoWidth: false
            });
        }

        console.log('✅ Tabela de motivos de perda atualizada com', dadosTabela.length, 'motivos (DataTable)');
        
    } catch (error) {
        console.error("❌ Erro geral na função updateMotivosPerdaTable:", error);
    }
    
    console.log("=== FIM updateMotivosPerdaTable ===");
}

// Função para atualizar a tabela de descartes (motivos que começam com "Descarte")
function updateDescartesTable(dadosFiltrados) {
    console.log("=== INÍCIO updateDescartesTable ===");
    
    try {
        const tableEl = document.getElementById('descartes-table');
        if (!tableEl) {
            console.warn("⚠️ Elemento 'descartes-table' não encontrado — a placeholder provavelmente está ativa. Saindo sem atualizar.");
            return;
        }

        const tbody = tableEl.querySelector('tbody');
        if (!tbody) {
            console.error("❌ Elemento tbody da tabela 'descartes-table' não encontrado");
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
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #F8F9FA; padding: 20px;">Nenhum descarte encontrado no período selecionado</td></tr>';
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

        // Preparar dados para DataTable
        const tableData = dadosTabela.map(item => [item.motivo, item.percentual + '%', item.total]);

        if (descartesDataTable) {
            descartesDataTable.clear().rows.add(tableData).draw();
        } else {
            descartesDataTable = $("#descartes-table").DataTable({
                data: tableData,
                columns: [
                    { title: 'Motivo do Descarte' },
                    { title: '%' },
                    { title: 'Total' }
                ],
                columnDefs: [
                    { targets: 0, width: '58%', className: 'dt-left' },
                    { targets: 1, width: '12%', className: 'dt-center' },
                    { targets: 2, width: '12%', className: 'dt-center' },
                ],
                pageLength: 7,
                destroy: true,
                dom: 'Brtip',
                buttons: [{
                    extend: 'excelHtml5',
                    text: 'Exportar para Excel',
                    title: `Relatorio_Descartes_${new Date().toLocaleDateString('pt-BR')}`,
                    className: 'excel-button',
                    exportOptions: {
                        columns: [0,1,2],
                        format: {
                            body: function(data, row, column, node) {
                                if (column === 1 && typeof data === 'string') return data.replace('%','');
                                return data;
                            }
                        }
                    }
                }],
                language: {
                    sEmptyTable: 'Nenhum registro disponível na tabela',
                    sInfo: 'Mostrando _START_ a _END_ de _TOTAL_ entradas',
                    sInfoEmpty: 'Mostrando 0 a 0 de 0 entradas',
                    sInfoFiltered: '(filtrado de _MAX_ registros no total)',
                    sLengthMenu: 'Mostrar _MENU_ entradas',
                    sLoadingRecords: 'Carregando...',
                    sProcessing: 'Processando...',
                    sSearch: 'Pesquisar:',
                    sZeroRecords: 'Nenhum registro encontrado',
                    oPaginate: { sFirst: 'Primeiro', sPrevious: 'Anterior', sNext: 'Próximo', sLast: 'Último' },
                    oAria: { sSortAscending: ': ativar para ordenar a coluna de forma ascendente', sSortDescending: ': ativar para ordenar a coluna de forma descendente' }
                },
                createdRow: function(row, data, dataIndex) {
                    $(row).find('td').css({ 'text-align': 'center' });
                    $(row).find('td:first-child').css({ 'text-align': 'left' });
                    $(row).find('td:nth-child(2)').css({ 'text-align': 'left' });
                },
                autoWidth: false
            });
        }

        console.log('✅ Tabela de descartes atualizada com', dadosTabela.length, 'motivos (DataTable)');
        
    } catch (error) {
        console.error("❌ Erro geral na função updateDescartesTable:", error);
    }
    
    console.log("=== FIM updateDescartesTable ===");
}

// Função para atualizar a tabela de concorrentes (removida)
let concorrentesDataTable = null;
function updateConcorrentesTable(dadosFiltrados) {
    try {
        console.log('=== INÍCIO updateConcorrentesTable ===');

        const tbodyEl = document.getElementById('concorrentes-table') || null;
        if (!tbodyEl) {
            console.info('concorrentes table not present in DOM - skipping population');
            return;
        }

        // Filtrar leads perdidos (fase ou campo indicativo) e cujo motivo mencione concorrente
        const leadsPerdidos = dadosFiltrados.filter(item => {
            try {
                const titulo = (item.titulo || '').toString().trim();
                if (!titulo) return false;
                const fase = (item.fase_perdido || '').toString().toLowerCase();
                const estaPerdido = fase.includes('7.2') || fase.includes('perdido');
                if (!estaPerdido) return false;
                const motivo = (item.concat_motivo_perda || '').toString().toLowerCase();
                if (!motivo) return false;
                // Aceitar variações que contenham 'concorrente' ou 'concorr' e termos de fechamento
                return motivo.includes('concorrente') || motivo.includes('concorr') || motivo.includes('fechou com o concorrente') || motivo.includes('fechou com concorrente') || motivo.includes('fechou com o concorr') || motivo.includes('fechou com') && motivo.includes('concorr');
            } catch (e) {
                return false;
            }
        });

        // Agregar por nome do concorrente (campo concat_concorrente)
        const contador = {};
        let total = 0;
        leadsPerdidos.forEach(item => {
            let conc = (item.concat_concorrente || '').toString().trim();
            if (!conc) conc = 'Concorrente não informado';
            contador[conc] = (contador[conc] || 0) + 1;
            total++;
        });

        const tabela = Object.keys(contador).map(c => ({
            concorrente: c,
            total: contador[c],
            percentual: total === 0 ? 0 : parseFloat(((contador[c] / total) * 100).toFixed(1))
        })).sort((a, b) => b.total - a.total);

        const rows = tabela.map(item => [item.concorrente, `${item.percentual}%`, item.total]);

        if (concorrentesDataTable) {
            concorrentesDataTable.clear().rows.add(rows).draw();
        } else {
            concorrentesDataTable = $("#concorrentes-table").DataTable({
                data: rows,
                pageLength: 10,
                language: {
                    sEmptyTable: "Nenhum registro disponível na tabela",
                    sInfo: "Mostrando _START_ a _END_ de _TOTAL_ entradas",
                    sInfoEmpty: "Mostrando 0 a 0 de 0 entradas",
                    sInfoFiltered: "(filtrado de _MAX_ registros no total)",
                    sLengthMenu: "Mostrar _MENU_ entradas",
                    sLoadingRecords: "Carregando...",
                    sProcessing: "Processando...",
                    sSearch: "Pesquisar:",
                    sZeroRecords: "Nenhum registro encontrado",
                    oPaginate: { sFirst: "Primeiro", sPrevious: "Anterior", sNext: "Próximo", sLast: "Último" },
                    oAria: { sSortAscending: ": ativar para ordenar a coluna de forma ascendente", sSortDescending: ": ativar para ordenar a coluna de forma descendente" }
                },
                destroy: true,
                dom: "Brtip",
                buttons: [{
                    extend: "excelHtml5", text: "Exportar para Excel", title: `Relatorio_Concorrentes_${new Date().toLocaleDateString("pt-BR")}`, className: "excel-button",
                    exportOptions: {
                        format: {
                            body: function (data, row, column, node) {
                                if (column === 1) { return Number(String(data).replace(/[^0-9\-\.]/g, '')) || 0; }
                                if (column === 2) { return Number(String(data).replace(/[^0-9\-\.]/g, '')) || 0; }
                                return data;
                            }
                        }
                    }
                }],
                createdRow: function(row, data, dataIndex) {
                    $(row).find('td').css({ 'text-align': 'center' });
                    $(row).find('td:nth-child(1)').css({ 'text-align': 'left' });
                    $(row).find('td:nth-child(2)').css({ 'text-align': 'right' });
                    $(row).find('td:nth-child(3)').css({ 'text-align': 'right' });
                },
                autoWidth: false
            });
            setTimeout(function() { try { concorrentesDataTable.columns.adjust(); } catch (e) { } }, 120);
        }

        console.log('✅ Tabela de concorrentes atualizada com', tabela.length, 'linhas');

    } catch (err) {
        console.error('Erro em updateConcorrentesTable:', err);
    }
    console.log('=== FIM updateConcorrentesTable ===');
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

// --- Nova função: Monta e inicializa a tabela de indicadores operacionais ---
function updateIndicatorsTable(selectedUnidades, startDate, endDate) {
    // Construir mapa por unidade
    const unidades = selectedUnidades && selectedUnidades.length > 0 ? selectedUnidades :
        [...new Set([...(allData || []).map(d => d.nm_unidade).filter(Boolean), ...(funilData || []).map(d => d.nm_unidade).filter(Boolean), ...(fundosData || []).map(d => d.nm_unidade).filter(Boolean)])];

    const rows = unidades.map(unidade => {
        // LEADS: contar títulos do funil no período para a unidade
        const leadsResultado = (funilData || []).filter(f => f.nm_unidade === unidade).filter(item => {
            let criado = item.criado_em || (item.row_data && item.row_data[12]) || item.criado_em;
            let criadoDate = null;
            if (criado instanceof Date) criadoDate = criado;
            else if (typeof criado === 'string') {
                const parts = criado.match(/(\d{2})\/(\d{2})\/(\d{4})/);
                if (parts) criadoDate = new Date(parts[3], parts[2]-1, parts[1]);
                else criadoDate = new Date(criado);
            }
            return criadoDate && criadoDate >= startDate && criadoDate < endDate && item.titulo && item.titulo.trim() !== '';
        }).length;

        // LEADS meta: somar metasData para essa unidade no período
        let leadsMeta = 0;
        metasData.forEach((metaInfo, chave) => {
            const [u, ano, mes] = chave.split('-');
            if (!u || u !== unidade) return;
            if (ano && mes) {
                const metaDate = new Date(Number(ano), Number(mes)-1, 1);
                const metaRangeStart = new Date(metaDate.getFullYear(), metaDate.getMonth(), 1);
                const metaRangeEnd = new Date(metaDate.getFullYear(), metaDate.getMonth()+1, 1);
                if (metaRangeStart < endDate && metaRangeEnd > startDate) {
                    leadsMeta += (metaInfo.meta_leads || 0);
                }
            }
        });

        // REUNIÕES: aplicar regra BH/BJ
        const reunioesResultado = (funilData || []).filter(f => f.nm_unidade === unidade).reduce((acc, item) => {
            let dateStr = item.diagnostico_realizado && item.diagnostico_realizado.toString().trim() !== '' ? item.diagnostico_realizado :
                (item.proposta_enviada && item.proposta_enviada.toString().trim() !== '' ? item.proposta_enviada : null);
            if (!dateStr) return acc;
            let parsedDate = null;
            if (typeof dateStr === 'string') {
                const parts = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
                if (parts) parsedDate = new Date(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1]));
                else {
                    const dt = new Date(dateStr);
                    if (!isNaN(dt)) parsedDate = dt;
                }
            } else if (dateStr instanceof Date) parsedDate = dateStr;
            if (!parsedDate) return acc;
            if (parsedDate >= startDate && parsedDate < endDate) return acc + 1;
            return acc;
        }, 0);

        let reunioesMeta = 0;
        metasData.forEach((metaInfo, chave) => {
            const [u, ano, mes] = chave.split('-');
            if (!u || u !== unidade) return;
            if (ano && mes) {
                const metaDate = new Date(Number(ano), Number(mes)-1, 1);
                const metaRangeStart = new Date(metaDate.getFullYear(), metaDate.getMonth(), 1);
                const metaRangeEnd = new Date(metaDate.getFullYear(), metaDate.getMonth()+1, 1);
                if (metaRangeStart < endDate && metaRangeEnd > startDate) {
                    reunioesMeta += (metaInfo.meta_reunioes || 0);
                }
            }
        });

        // CONTRATOS: contar id_fundo em fundosData dentro do periodo
        const contratosResultado = (fundosData || []).filter(f => f.nm_unidade === unidade && f.dt_contrato && f.dt_contrato >= startDate && f.dt_contrato < endDate).length;
        let contratosMeta = 0;
        metasData.forEach((metaInfo, chave) => {
            const [u, ano, mes] = chave.split('-');
            if (!u || u !== unidade) return;
            if (ano && mes) {
                const metaDate = new Date(Number(ano), Number(mes)-1, 1);
                const metaRangeStart = new Date(metaDate.getFullYear(), metaDate.getMonth(), 1);
                const metaRangeEnd = new Date(metaDate.getFullYear(), metaDate.getMonth()+1, 1);
                if (metaRangeStart < endDate && metaRangeEnd > startDate) {
                    contratosMeta += (metaInfo.meta_contratos || 0);
                }
            }
        });

        // ADESOES: contar codigo_integrante em allData dentro do periodo
        const adesoesResultado = (allData || []).filter(d => d.nm_unidade === unidade && d.dt_cadastro_integrante && d.dt_cadastro_integrante >= startDate && d.dt_cadastro_integrante < endDate && d.codigo_integrante && d.codigo_integrante.toString().trim() !== '').length;
        let adesoesMeta = 0;
        metasData.forEach((metaInfo, chave) => {
            const [u, ano, mes] = chave.split('-');
            if (!u || u !== unidade) return;
            if (ano && mes) {
                const metaDate = new Date(Number(ano), Number(mes)-1, 1);
                const metaRangeStart = new Date(metaDate.getFullYear(), metaDate.getMonth(), 1);
                const metaRangeEnd = new Date(metaDate.getFullYear(), metaDate.getMonth()+1, 1);
                if (metaRangeStart < endDate && metaRangeEnd > startDate) {
                    adesoesMeta += (metaInfo.meta_adesoes || 0);
                }
            }
        });

        // VVR: percentual (usar charts/calculations existentes se quiser precisão por unidade)
        // Aqui calculamos um valor simplificado: se houver vendas na unidade no período, usar média percentual (realizado/meta_total)
        let vvrPercent = 0;
        // tentar encontrar meta_vvr_total e realizado por unidade no periodo
        let totalRealizado = 0, totalMeta = 0;
        (allData || []).filter(d => d.nm_unidade === unidade && d.dt_cadastro_integrante && d.dt_cadastro_integrante >= startDate && d.dt_cadastro_integrante < endDate).forEach(d => {
            totalRealizado += (d.vl_plano || 0);
        });
        metasData.forEach((metaInfo, chave) => {
            const [u, ano, mes] = chave.split('-');
            if (!u || u !== unidade) return;
            if (ano && mes) {
                const metaDate = new Date(Number(ano), Number(mes)-1, 1);
                const metaRangeStart = new Date(metaDate.getFullYear(), metaDate.getMonth(), 1);
                const metaRangeEnd = new Date(metaDate.getFullYear(), metaDate.getMonth()+1, 1);
                if (metaRangeStart < endDate && metaRangeEnd > startDate) {
                    totalMeta += (metaInfo.meta_vvr_total || 0);
                }
            }
        });
        if (totalMeta > 0) vvrPercent = totalRealizado / totalMeta;

        return {
            unidade,
            leadsPercent: leadsMeta > 0 ? leadsResultado / leadsMeta : 0,
            reunioesPercent: reunioesMeta > 0 ? reunioesResultado / reunioesMeta : 0,
            contratosPercent: contratosMeta > 0 ? contratosResultado / contratosMeta : 0,
            adesoesPercent: adesoesMeta > 0 ? adesoesResultado / adesoesMeta : 0
        };
    });

    // Montar linhas para DataTable (apenas porcentagens conforme solicitado)
    const tableData = rows.map(r => [
        r.unidade,
        `${(r.leadsPercent * 100).toFixed(1)}%`,
        `${(r.reunioesPercent * 100).toFixed(1)}%`,
        `${(r.contratosPercent * 100).toFixed(1)}%`,
        `${(r.adesoesPercent * 100).toFixed(1)}%`
    ]);

    // Inicializar/atualizar DataTable
    // Ensure DataTable is created with Portuguese language even if it was initialized elsewhere
    if ($.fn.DataTable.isDataTable('#indicadores-table')) {
        // Destroy previous instance to avoid residual English labels from other initializers
        $('#indicadores-table').DataTable().destroy();
        $('#indicadores-table').empty();
    }

    // (Re)create the DataTable with the correct language and data
    $('#indicadores-table').DataTable({
        data: tableData,
        columns: [
            { title: 'Unidade' },
            { title: 'Leads (%)' },
            { title: 'Reuniões (%)' },
            { title: 'Contratos (%)' },
            { title: 'Adesões (%)' }
        ],
        language: {
            sEmptyTable: "Nenhum registro disponível na tabela",
            sInfo: "Mostrando _START_ a _END_ de _TOTAL_ entradas",
            sInfoEmpty: "Mostrando 0 a 0 de 0 entradas",
            sInfoFiltered: "(filtrado de _MAX_ registros no total)",
            sLengthMenu: "Mostrar _MENU_ entradas",
            sLoadingRecords: "Carregando...",
            sProcessing: "Processando...",
            sSearch: "Pesquisar:",
            searchPlaceholder: "Pesquisar...",
            sZeroRecords: "Nenhum registro encontrado",
            oPaginate: { sFirst: "Primeiro", sPrevious: "Anterior", sNext: "Próximo", sLast: "Último" },
            oAria: { sSortAscending: ": ativar para ordenar a coluna de forma ascendente", sSortDescending: ": ativar para ordenar a coluna de forma descendente" }
        },
        dom: 'Bfrtip',
        buttons: [{
            extend: 'excelHtml5', text: 'Exportar para Excel', title: `Indicadores_Operacionais_${new Date().toLocaleDateString('pt-BR')}`
        }]
    });

    // Garantir que o label e o placeholder fiquem em Português mesmo que uma inicialização anterior
    // tenha criado elementos em Inglês (forçar substituição direta no DOM do wrapper)
    try {
        const wrapper = $('#indicadores-table_wrapper');
        const label = wrapper.find('.dataTables_filter label');
        // Substitui apenas o nó de texto (não remove o input)
        label.contents().filter(function() { return this.nodeType === 3; }).each(function() { this.nodeValue = 'Pesquisar: '; });
        wrapper.find('input[type="search"]').attr('placeholder', 'Pesquisar...');
    } catch (e) {
        // se algo falhar aqui, não quebramos a página; log opcional
        console.warn('Não foi possível forçar o label do DataTable indicadores para PT-BR', e);
    }
}

// --- Nova função: tabela de Captações (base FUNIL) no estilo da página 2 ---
let captacoesFunilDataTable = null;
function getTipoCaptacaoFromOrigem(origem) {
    if (!origem) return 'Captação Ativa';
    const o = origem.toString().trim();
    switch (o) {
        case 'Presencial - Ligação/WPP Telefone Consultor (a)': return 'Captação Passiva';
        case 'Digital - Redes Sociais - VIVA Brasil': return 'Captação Passiva - Exclusiva Viva BR';
        case 'Digital - Redes Sociais - Instagram Local': return 'Captação Passiva';
        case 'Digital - Site VIVA Brasil': return 'Captação Passiva - Exclusiva Viva BR';
        case 'Digital - Card Google': return 'Captação Passiva - Exclusiva Viva BR';
        case 'Indicação - Via Atlética/DA/CA': return 'Captação Passiva';
        case 'Indicação - Via outra Franquia/Consultor VIVA': return 'Captação Passiva';
        case 'Digital - Redes Sociais - Instagram Consultor (a)': return 'Captação Passiva';
        case 'Presencial - Ligação Telefone Franquia': return 'Captação Passiva';
        case 'Indicação - Via Integrante de Turma': return 'Captação Passiva';
        case 'Presencial - Visita Sede Franquia': return 'Captação Passiva';
        case 'Digital - Campanha paga - Instagram Local': return 'Captação Passiva';
        default: return 'Captação Ativa';
    }
}

function updateCaptacoesFunilTable(funilRows) {
    try {
        if (!Array.isArray(funilRows)) {
            console.warn('updateCaptacoesFunilTable: esperado array, recebeu:', funilRows);
            return;
        }

        // Coluna G na planilha -> assumimos que o objeto tem propriedade 'origem_lead' ou similar
        // Agrupar por origem
        const contador = {};
        funilRows.forEach(r => {
            const origem = (r.origem_lead || r['Origem do Lead'] || r['origem'] || '').toString().trim() || 'Não informado';
            contador[origem] = (contador[origem] || 0) + 1;
        });

        const total = Object.values(contador).reduce((s, v) => s + v, 0) || 0;

        const tabela = Object.keys(contador).map(origem => {
            const tot = contador[origem];
            const tipo = getTipoCaptacaoFromOrigem(origem);
            const percentual = total === 0 ? 0 : parseFloat(((tot / total) * 100).toFixed(1));
            return { origem, tipo, percentual, total: tot };
        }).sort((a, b) => b.total - a.total);

        // Preparar linhas para DataTable
        const rows = tabela.map(item => [item.origem, item.tipo, `${item.percentual}%`, item.total]);

        if (captacoesFunilDataTable) {
            captacoesFunilDataTable.clear().rows.add(rows).draw();
            try { captacoesFunilDataTable.columns.adjust(); } catch(e) { console.warn('adjust failed', e); }
            // Ajusta larguras do header/footer clonados
            try { adjustCaptacoesClonedWidths(); } catch(e) { }
        } else {
            captacoesFunilDataTable = $('#captacoes-funil-table').DataTable({
                data: rows,
                // Use standard paging (like consultor table) to keep alignment consistent
                // Set explicit approximate column widths so the % and TOTAL columns
                // have more room and the first two text columns are slightly narrower.
                columns: [
                    { title: 'Origem do Lead', className: 'dt-left', width: '30%' },
                    { title: 'Tipo de captação', className: 'dt-left', width: '28%' },
                    { title: '%', className: 'dt-left', width: '18%' },
                    { title: 'TOTAL', className: 'dt-left', width: '24%' }
                ],
                columnDefs: [
                    { targets: [2,3], className: 'dt-right' },
                    { targets: [0,1], className: 'dt-left' }
                ],
                // Let DataTables handle widths; use paging instead of scroll to avoid cloned headers
                pageLength: 7,
                paging: true,
                language: {
                    sEmptyTable: "Nenhum registro disponível na tabela",
                    sInfo: "Mostrando _START_ a _END_ de _TOTAL_ entradas",
                    sInfoEmpty: "Mostrando 0 a 0 de 0 entradas",
                    sInfoFiltered: "(filtrado de _MAX_ registros no total)",
                    sLengthMenu: "Mostrar _MENU_ entradas",
                    sLoadingRecords: "Carregando...",
                    sProcessing: "Processando...",
                    sSearch: "Pesquisar:",
                    sZeroRecords: "Nenhum registro encontrado",
                    oPaginate: { sFirst: "Primeiro", sPrevious: "Anterior", sNext: "Próximo", sLast: "Último" },
                    oAria: { sSortAscending: ": ativar para ordenar a coluna de forma ascendente", sSortDescending: ": ativar para ordenar a coluna de forma descendente" }
                },
                destroy: true,
                dom: "Bfrtip",
                buttons: [{
                    extend: "excelHtml5", text: "Exportar para Excel", title: `Relatorio_Captacoes_Funil_${new Date().toLocaleDateString("pt-BR")}`, className: "excel-button",
                    exportOptions: {
                        format: {
                            body: function (data, row, column, node) {
                                if (column === 3) { return Number(String(data).replace(/[^0-9\-\.]/g, '')) || 0; }
                                return data;
                            }
                        }
                    }
                }],
                createdRow: function(row, data, dataIndex) {
                    // Default: center for visual balance, then force left alignment for the first
                    // four columns to match the rest of the dashboard (user requested left alignment)
                    $(row).find('td').css({ 'text-align': 'center' });
                    $(row).find('td:nth-child(1)').css({ 'text-align': 'left' });
                    $(row).find('td:nth-child(2)').css({ 'text-align': 'left' });
                    $(row).find('td:nth-child(3)').css({ 'text-align': 'left' });
                    $(row).find('td:nth-child(4)').css({ 'text-align': 'left' });
                }
            });
            // Forçar ajuste das colunas logo após render para evitar desalinhamento do header/body
            setTimeout(function() {
                try { captacoesFunilDataTable.columns.adjust(); } catch (e) { console.warn('captacoesFunil columns.adjust failed', e); }
                try { adjustCaptacoesClonedWidths(); } catch (e) { }
            }, 150);
            // Reajustar em resize da janela
            $(window).off('resize.captacoesFunil').on('resize.captacoesFunil', function() {
                try { if (captacoesFunilDataTable) captacoesFunilDataTable.columns.adjust(); } catch (e) { }
                try { adjustCaptacoesClonedWidths(); } catch (e) { }
                setTimeout(function() { try { adjustCaptacoesClonedWidths(); } catch (e) { } }, 80);
            });
        }

        // No footer summary: intentionally removed per user request.
        try { adjustCaptacoesClonedWidths(); } catch (e) { }
    } catch (err) {
        console.error('Erro em updateCaptacoesFunilTable:', err);
    }
}

// Copia larguras das colunas reais para os elementos clonados do DataTables (scroll mode)
function adjustCaptacoesClonedWidths() {
    const $table = $('#captacoes-funil-table');
    const $wrapper = $('#captacoes-funil-table_wrapper');
    if (!$table.length || !$wrapper.length) return;

    const $bodyTable = $wrapper.find('.dataTables_scrollBody table');
    const $headTable = $wrapper.find('.dataTables_scrollHeadInner table');
    const $footTable = $wrapper.find('.dataTables_scrollFootInner table');
    if (!$bodyTable.length || !$headTable.length) return;
    // Use the original table's THEAD TH widths as the authoritative source
    const $origHeader = $table.find('thead tr th');
    if (!$origHeader.length) return;

    const $headCols = $headTable.find('tr th, tr td');
    const $footCols = $footTable.find('tr td');

    $origHeader.each(function(i, th) {
        const w = $(th).outerWidth();
        if ($headCols.eq(i).length) $headCols.eq(i).css({ 'width': w + 'px', 'min-width': w + 'px' });
        if ($footCols.eq(i).length) $footCols.eq(i).css({ 'width': w + 'px', 'min-width': w + 'px' });
        // preserve alignment
        const align = $(th).css('text-align') || 'left';
        if ($footCols.eq(i).length) $footCols.eq(i).css('text-align', align);
    });

    // final adjust
    try { if (captacoesFunilDataTable) captacoesFunilDataTable.columns.adjust(); } catch(e) { }
}

// Equaliza a altura dos .table-card lado-a-lado sem forçar o conteúdo da tabela a esticar
function equalizeSideBySideTableCards() {
    try {
        const container = document.querySelector('.tabelas-lado-a-lado');
        if (!container) return;
        const cards = Array.from(container.querySelectorAll('.table-card'));
        if (!cards.length) return;

        // reset inline heights
        cards.forEach(c => c.style.height = '');

        // measure heights and set all to the max
        const heights = cards.map(c => c.getBoundingClientRect().height);
        const max = Math.max(...heights);
        cards.forEach(c => c.style.height = Math.ceil(max) + 'px');
    } catch (e) {
        console.warn('equalizeSideBySideTableCards failed', e);
    }
}

// Debounce helper
function debounce(fn, wait) {
    let t;
    return function(...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
}

// Run on load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(equalizeSideBySideTableCards, 200);
});

// Re-run on resize (debounced)
window.addEventListener('resize', debounce(equalizeSideBySideTableCards, 120));

// Observe mutations inside the side-by-side container (tables redraws/paginacao)
(function observeSideBySideChanges() {
    const container = document.querySelector('.tabelas-lado-a-lado');
    if (!container) return;
    const mo = new MutationObserver(debounce(() => equalizeSideBySideTableCards(), 100));
    mo.observe(container, { childList: true, subtree: true, attributes: true, characterData: false });
})();