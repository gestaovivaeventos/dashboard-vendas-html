// server.js - Versão Final para a Central de Dashboards

// --- 1. Importação dos Módulos ---
require('dotenv').config(); // Carrega as variáveis do arquivo .env no início de tudo
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const { atob } = require('buffer'); // Importa 'atob' para decodificar o token pk

const app = express();
const PORT = process.env.PORT || 3000;

console.log('--- INICIANDO SERVIDOR DA CENTRAL DE DASHBOARDS ---');

// --- 2. Carregamento e Validação de Dados Sensíveis ---
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const API_KEY = process.env.GOOGLE_API_KEY;

if (!SPREADSHEET_ID || !API_KEY) {
    console.error('ERRO CRÍTICO: Variáveis SPREADSHEET_ID ou GOOGLE_API_KEY não encontradas no arquivo .env!');
    process.exit(1); // Encerra a aplicação se as chaves não estiverem configuradas
} else {
    console.log('Variáveis de ambiente (.env) carregadas com sucesso.');
}

// --- 3. Configurações e Lógica de Negócios (Seguras no Backend) ---

// Mapeamento dos links dos dashboards para evitar exposição no frontend
const dashboardLinks = {
    'preview-okrs': `https://okr-gestao-por-resultados.vercel.app/?pk=`,
    'preview-kpis-franquia': 'https://kpi-gestao-por-resultados.vercel.app/',
    'preview-vendas': `https://dashboard-vendas-html.vercel.app/?pk=`,
    'preview-carteira': 'https://lookerstudio.google.com/u/1/reporting/5e31734c-7040-4514-8902-238cb49a6b6f/page/KiYRD',
    'preview-inadimplencia': 'https://lookerstudio.google.com/u/1/reporting/5e31734c-7040-4514-8902-238cb49a6b6f/page/p_ac1cizod6c',
    'preview-pesquisas': 'https://lookerstudio.google.com/u/1/reporting/7e2c7c08-82bd-4aab-91b6-192debe87578/page/KiYRD',
    'preview-kpis': 'https://lookerstudio.google.com/u/1/reporting/54a56017-01ec-4899-88eb-2e9859f0107a/page/p_iped50sead',
    'preview-eventos': 'https://lookerstudio.google.com/u/1/reporting/d7a28ada-0f2e-4af6-9569-0d9daa65292c/page/A5HmE',
    'preview-academy': 'https://lookerstudio.google.com/u/1/reporting/7bbe97a2-84d5-4261-a834-a8a63507fadc/page/O479D'
};

// Mapeamento dos níveis de permissão
const levelPermissions = {
    '22': ['all'],
    '1': ['preview-okrs', 'preview-vendas', 'preview-carteira', 'preview-inadimplencia', 'preview-pesquisas', 'preview-kpis', 'preview-eventos', 'preview-academy'],
    '2': ['preview-vendas', 'preview-carteira', 'preview-inadimplencia', 'preview-pesquisas', 'preview-kpis', 'preview-eventos', 'preview-academy'],
    '3': ['preview-okrs']
};

// --- 4. Middlewares ---
app.use(express.json()); // Permite que o servidor interprete JSON nas requisições
app.use(express.static(path.join(__dirname, 'public'))); // Serve os arquivos da pasta 'public' (HTML, CSS, JS do cliente)

// --- 5. Endpoints da API ---

/**
 * Endpoint de Login: Valida as credenciais do usuário contra a planilha do Google.
 */
app.post('/api/login', async (req, res) => {
    console.log('\n[LOG] Recebida nova requisição em /api/login');
    const { loginCode } = req.body;
    console.log(`[LOG] Código de login recebido: "${loginCode}"`);

    if (!loginCode) {
        return res.status(400).json({ success: false, message: 'Login não fornecido.' });
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/base?key=${API_KEY}`;
    
    try {
        const response = await fetch(url);
        console.log(`[LOG] Resposta da API do Google recebida com status: ${response.status}`);
        if (!response.ok) throw new Error('Falha ao comunicar com a API do Google.');

        const data = await response.json();
        const rows = data.values || [];
        let foundUser = null;

        for (const row of rows.slice(1)) {
            const [, accessCode, accessLevel, userName, , login] = row;
            const userLogin = (login && login.trim()) || (accessCode ? accessCode.trim() : null);

            if (userLogin && userLogin.toLowerCase() === loginCode.toLowerCase()) {
                console.log(`[LOG] Usuário encontrado na planilha: ${userName}`);
                foundUser = {
                    level: accessLevel ? accessLevel.trim() : null,
                    user: userName ? userName.trim() : 'Usuário',
                };
                break;
            }
        }

        if (foundUser && levelPermissions[foundUser.level]) {
            console.log('[LOG] Login bem-sucedido. Enviando resposta para o frontend.');
            res.json({
                success: true,
                userData: { user: foundUser.user },
                permissions: levelPermissions[foundUser.level]
            });
        } else {
            console.warn('[AVISO] Tentativa de login inválida.');
            res.status(401).json({ success: false, message: 'Login inválido!' });
        }
    } catch (error) {
        console.error("\n--- ERRO CAPTURADO NO ENDPOINT /api/login ---", error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
});

/**
 * Endpoint de Redirecionamento: Esconde a URL real dos dashboards.
 */
app.get('/open-dashboard', (req, res) => {
    const { id, pk } = req.query;

    if (!id || !dashboardLinks[id]) {
        return res.status(404).send('<h1>Dashboard não encontrado.</h1>');
    }

    let finalUrl = dashboardLinks[id];
    // Adiciona o token 'pk' se a URL do dashboard precisar dele
    if (finalUrl.endsWith('?pk=')) {
        finalUrl += pk;
    }

    res.redirect(finalUrl);
});

/**
 * Endpoint de Validação de Token (pk): Permite que outros serviços verifiquem a validade de um usuário.
 */
app.post('/api/validate-token', async (req, res) => {
    const { pk } = req.body;
    let decodedLogin;

    if (!pk) {
        return res.status(400).json({ valid: false, message: 'Token não fornecido.' });
    }

    try {
        decodedLogin = atob(pk);
    } catch (e) {
        return res.status(400).json({ valid: false, message: 'Token inválido.' });
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/base?key=${API_KEY}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Falha na comunicação com a API do Google.');
        
        const data = await response.json();
        const rows = data.values || [];
        let userExists = false;

        for (const row of rows.slice(1)) {
            const [, accessCode, , , , login] = row;
            const userLogin = (login && login.trim()) || (accessCode ? accessCode.trim() : null);

            if (userLogin && userLogin.toLowerCase() === decodedLogin.toLowerCase()) {
                userExists = true;
                break;
            }
        }

        if (userExists) {
            res.json({ valid: true, user: decodedLogin });
        } else {
            res.status(401).json({ valid: false, message: 'Usuário não encontrado.' });
        }
    } catch (error) {
        console.error("\n--- ERRO CAPTURADO NO ENDPOINT /api/validate-token ---", error);
        res.status(500).json({ valid: false, message: 'Erro interno do servidor.' });
    }
});


// --- 6. Inicialização do Servidor ---
app.listen(PORT, () => {
    console.log(`\n✅ Servidor rodando com sucesso na porta ${PORT}`);
    console.log(`🚀 Acesse a aplicação localmente em http://localhost:${PORT}`);
});

// Forçando um novo push para o Vercel