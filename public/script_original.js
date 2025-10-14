// Arquivo: script.js (da Central de Dashboards) - COM LÓGICA DE FAVORITOS

document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURAÇÕES DA PLANILHA E API ---
    const SPREADSHEET_ID = "1QEsm1u0LDY_-8y_EWgifzUHJCHoz3_VOoUOSXuJZzSM";
    const SHEET_NAME = "base";
    const API_KEY = "AIzaSyBuGRH91CnRuDtN5RGsb5DvHEfhTxJnWSs"; // <-- SUBSTITUA PELA SUA CHAVE

    // --- MAPEAMENTO DE PERMISSÕES POR NÍVEL DE ACESSO ---
    const levelPermissions = {
    // Nível 22 (Super Admin): Tem acesso a tudo.
    '22': ['all'],

    // Nível 1 (Franqueadora): Tem acesso a tudo, EXCETO ao 'Relatório Gerencial'.
    '1': [
        'preview-okrs',
        //'preview-kpis-franquia', // Acesso ao Relatório Gerencial REMOVIDO
        'preview-vendas',
        'preview-carteira',
        'preview-inadimplencia',
        'preview-pesquisas',
        'preview-kpis',
        'preview-eventos',
        'preview-academy'
    ],

    // Nível 2 (Franquias): Tem acesso apenas aos 'Dashboards Gerais'.
    '2': [
        'preview-vendas',
        'preview-carteira',
        'preview-inadimplencia',
        'preview-pesquisas',
        'preview-kpis',
        'preview-eventos',
        'preview-academy'
    ],
    // --- NOVO NÍVEL ADICIONADO ---
    // Nível 3 (Feat): Tem acesso apenas ao dashboard de OKRs.
    '3': [
        'preview-okrs'
    ]
};
    
    const loginScreen = document.getElementById('login-screen');
    const dashboardWrapper = document.getElementById('dashboard-wrapper');
    const submitButton = document.getElementById('submit-code');
    const codeInput = document.getElementById('access-code');
    const errorMessage = document.getElementById('error-message');

    let accessData = new Map();
    let currentUserCode = null; // Guardará o código do usuário logado

    async function fetchAccessData() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}?key=${API_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Falha ao carregar os dados de acesso. Verifique a planilha ou a chave de API.');
        }
        const data = await response.json();
        const rows = data.values || [];

        accessData.clear();
        // A lógica agora captura as colunas: unitName, accessCode, accessLevel, userName, setor, login
        rows.slice(1).forEach(row => {
            const [unitName, accessCode, accessLevel, userName, setor, login] = row;

            // Prioriza o login se existir, senão usa o accessCode
            const userLogin = login && login.trim() ? login.trim() : (accessCode ? accessCode.trim() : null);

            if (userLogin && accessLevel) {
                accessData.set(userLogin, {
                    unit: unitName ? unitName.trim() : 'Unidade',
                    level: accessLevel.trim(),
                    // Adicionamos o nome do usuário e setor ao nosso objeto de dados
                    user: userName ? userName.trim() : 'Usuário',
                    setor: setor ? setor.trim() : 'Setor'
                });
            }
        });

        return true;

    } catch (error) {
        console.error("Erro ao buscar dados da planilha:", error);
        errorMessage.textContent = 'Erro ao conectar com o servidor de acesso.';
        errorMessage.style.display = 'block';
        submitButton.disabled = true;
        codeInput.disabled = true;
        return false;
    }
}
    
    // --- LÓGICA DE FAVORITOS ---

    // Carrega os favoritos do localStorage
    function getFavorites() {
        const favorites = localStorage.getItem('dashboardFavorites');
        return favorites ? JSON.parse(favorites) : {};
    }

    // Salva os favoritos no localStorage
    function saveFavorites(favorites) {
        localStorage.setItem('dashboardFavorites', JSON.stringify(favorites));
    }
    
    // Configura a interatividade dos botões de favorito
    // Arquivo: script.js (da Central de Dashboards)

// ...

    function setupFavorites(userCode) {
        const favoriteLinks = document.querySelectorAll('.dashboard-list a');
        
        const updateUserFavoritesUI = () => {
            const currentFavorites = getFavorites();
            const userFavoriteData = currentFavorites[userCode];
            
            favoriteLinks.forEach(link => {
                const star = link.querySelector('.favorite-star');
                if (star) {
                    // A UI agora é atualizada com base no ID salvo no objeto
                    if (userFavoriteData && link.getAttribute('data-target') === userFavoriteData.id) {
                        star.classList.add('active');
                    } else {
                        star.classList.remove('active');
                    }
                }
            });
        };

        favoriteLinks.forEach(link => {
            const star = link.querySelector('.favorite-star');
            if (star) {
                star.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const favorites = getFavorites();
                    const dashboardId = link.getAttribute('data-target');
                    const userFavoriteData = favorites[userCode];

                    // Se o dashboard clicado já é o favorito, desmarca
                    if (userFavoriteData && userFavoriteData.id === dashboardId) {
                        delete favorites[userCode];
                    } else {
                        // Senão, salva o NOVO objeto completo do favorito
                        favorites[userCode] = {
                            id: dashboardId,
                            href: link.getAttribute('href'), // Salva o href original
                            target: (link.target || '_self') // Registra se o link abre em nova guia
                        };
                    }

                    saveFavorites(favorites);
                    updateUserFavoritesUI();
                });
            }
        });

        updateUserFavoritesUI();
    }
    
// ...

    function showDashboard(code, permissions) {
    currentUserCode = code;

    // --- LÓGICA DE PERSONALIZAÇÃO DA MENSAGEM ---
    const userData = accessData.get(code);
    const welcomeGreetingEl = document.getElementById('welcome-greeting');

    if (userData && userData.user && welcomeGreetingEl) {
        // Pega o nome completo (ex: "MARCOS")
        const fullName = userData.user;
        // Pega apenas a primeira palavra (o primeiro nome)
        let firstName = fullName.split(' ')[0];
        // Formata para ter apenas a primeira letra maiúscula (ex: "Marcos")
        firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
        
        // Insere a saudação no HTML
        welcomeGreetingEl.textContent = `Olá, ${firstName}!`;
    }
    // --- FIM DA LÓGICA DE PERSONALIZAÇÃO ---

    const allMenuItems = document.querySelectorAll('.dashboard-list a[data-target]');
    const encodedCode = btoa(code);
    const navLinkVendas = document.getElementById('nav-link-vendas');
    const baseUrlVendas = 'https://dashboard-vendas-html.vercel.app/';
    
    if (navLinkVendas) {
        navLinkVendas.href = `${baseUrlVendas}?pk=${encodedCode}`;
    }

    // --- Bloco para o Dashboard de OKRs ---
    const navLinkOkrs = document.getElementById('nav-link-okrs');
    const baseUrlOkrs = 'https://okr-gestao-por-resultados.vercel.app/';
    if (navLinkOkrs) {
        navLinkOkrs.href = `${baseUrlOkrs}?pk=${encodedCode}`;
    }

    loginScreen.style.display = 'none';
    dashboardWrapper.style.display = 'flex';
    
    allMenuItems.forEach(link => link.style.display = 'none');
    document.querySelectorAll('.menu-group').forEach(group => group.style.display = 'none');

    if (permissions.includes('all')) {
        document.querySelectorAll('.menu-group').forEach(group => group.style.display = 'block');
        allMenuItems.forEach(link => link.style.display = 'flex');
    } else {
        const visibleGroups = new Set();
        permissions.forEach(permissionId => {
            const linkToShow = document.querySelector(`.dashboard-list a[data-target="${permissionId}"]`);
            if (linkToShow) {
                linkToShow.style.display = 'flex';
                const parentGroup = linkToShow.closest('.menu-group');
                if(parentGroup) visibleGroups.add(parentGroup);
            }
        });
        visibleGroups.forEach(group => group.style.display = 'block');
    }

    setupDashboardNavigation();
    setupFavorites(code);
}
    
    // Arquivo: script.js (da Central de Dashboards)

// ... (todo o código ANTES desta função permanece igual) ...

    // Arquivo: script.js (da Central de Dashboards)

// ... (todo o código ANTES desta função permanece igual) ...

   // Arquivo: script.js (da Central de Dashboards)

// ... (todo o código ANTES desta função permanece igual) ...

    // Arquivo: script.js (da Central de Dashboards)

// ...

    async function setupManualLogin() {
        loginScreen.style.display = 'flex';
        const success = await fetchAccessData();
        if (!success) return;

        const attemptLogin = () => {
            const code = codeInput.value.trim();
            const userData = accessData.get(code);

            if (!userData || !levelPermissions[userData.level]) {
                errorMessage.textContent = 'Login inválido!';
                errorMessage.style.display = 'block';
                codeInput.value = '';
                return;
            }

            const permissions = levelPermissions[userData.level];
            const favorites = getFavorites();
            const favoriteData = favorites[code];

            if (favoriteData && favoriteData.href && !favoriteData.href.startsWith('#')) {
                if (favoriteData.target === '_blank') {
                    // 1. Abre o dashboard favorito na nova aba
                    window.open(favoriteData.href, '_blank');
                    // 2. Mostra o dashboard na aba atual também
                    showDashboard(code, permissions);
                } else {
                    window.location.href = favoriteData.href;
                }
            } else {
                // Se não houver favorito, apenas mostra a central
                showDashboard(code, permissions);
            }
        };

        submitButton.addEventListener('click', attemptLogin);
        codeInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') attemptLogin();
        });
    }

// ... (todo o código DEPOIS desta função permanece igual) ...

    async function initialize() {
        const urlParams = new URLSearchParams(window.location.search);
        const encodedCodeFromUrl = urlParams.get('pk');
        let decodedCode = null;

        if (encodedCodeFromUrl) {
            try {
                decodedCode = atob(encodedCodeFromUrl);
            } catch (e) { console.error("Código na URL é inválido:", e); }
        }
        
        await fetchAccessData();
        
        const userData = decodedCode ? accessData.get(decodedCode) : null;

        // --- LÓGICA DE DECISÃO CORRIGIDA ---
        if (userData && levelPermissions[userData.level]) {
            // Se o código veio pela URL (pk), significa que o usuário está NAVEGANDO DE VOLTA.
            // Nesse caso, SEMPRE mostramos o dashboard principal, ignorando o favorito.
            const permissions = levelPermissions[userData.level];
            showDashboard(decodedCode, permissions);
        } else {
            // Se NÃO há um código válido na URL, é um acesso novo.
            // Mostramos a tela de login, e a lógica dela se encarregará do redirecionamento do favorito.
            setupManualLogin();
        }
    }

    initialize(); // Inicia o processo
});

// ... (todo o código depois desta função, como setupDashboardNavigation, permanece o mesmo) ...

function setupDashboardNavigation() {
    // ... (Esta função permanece a mesma da versão anterior)
    const listLinks = document.querySelectorAll('.dashboard-list a');
    const previewPanes = document.querySelectorAll('.preview-content');

    listLinks.forEach(link => {
        link.addEventListener('mouseenter', () => {
            listLinks.forEach(l => l.classList.remove('active'));
            previewPanes.forEach(p => p.classList.remove('active'));
            
            link.classList.add('active');
            const targetId = link.getAttribute('data-target');
            const activePreviewPane = document.getElementById(targetId);
            
            if (activePreviewPane) {
                activePreviewPane.classList.add('active');
            }
        });
    });

    const menuToggles = document.querySelectorAll('.menu-group-toggle');
    menuToggles.forEach(clickedToggle => {
        clickedToggle.addEventListener('click', () => {
            const currentGroup = clickedToggle.parentElement;
            const isAlreadyExpanded = currentGroup.classList.contains('expanded');
            document.querySelectorAll('.menu-group').forEach(group => group.classList.remove('expanded'));
            if (!isAlreadyExpanded) {
                currentGroup.classList.add('expanded');
            }
        });
    });
    
    const welcomePane = document.getElementById('welcome-pane');
    if(welcomePane) {
        previewPanes.forEach(p => p.classList.remove('active'));
        welcomePane.classList.add('active');
    }
}

