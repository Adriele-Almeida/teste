# Arquivo de conversas • Adriele Almeida

Aplicativo privado responsivo em português para leitura, busca, filtros, coleções, favoritos, retomada da leitura e exportação em TXT, JSON e PDF por impressão do navegador.

## Estado

Backend publicado no projeto Supabase `Automações Estratégicas` (`uptzkgvfdycxlqnsgokl`), com tabelas exclusivas `ac_*` e bucket privado `ac-originals`. Os JSON originais são mantidos byte por byte. O índice de leitura é derivado e preserva integralmente o objeto de cada registro. Todas as mensagens do mapping são apresentadas, inclusive ramificações, mensagens de ferramentas e sistema. Metadados e campos adicionais estão na aba Todos os dados. Exportações TXT e PDF incluem o JSON integral no final.

O acesso usa senha definida pela proprietária por um link de ativação de uso único. Senhas são derivadas com PBKDF2-SHA256, 310.000 iterações e salt individual. Sessões opacas de 30 dias são armazenadas somente em hash no servidor. Tentativas de entrada são limitadas. As tabelas usam RLS e acesso direto de anon/authenticated revogado. O serviço valida a sessão antes de cada operação. Chaves de serviço permanecem no ambiente do Supabase.

Favoritos, coleção e posição de leitura são gravados no servidor. Outros dispositivos consultam mudanças a cada 15 segundos, quando a aba está visível. Alterações são enviadas por campo, evitando sobrescrever campos diferentes. Alterações simultâneas do mesmo campo usam a última gravação. Sem conexão, novas operações exibem erro; a interface não promete gravação offline.

## Publicação no Vercel

Importar o repositório `Adriele-Almeida/teste`, branch `arquivo-conversas-20261016`, root directory `arquivo-conversas/app`, framework Other, sem build command. O app é estático, sem dependências frontend. A tentativa de criação do projeto pelo conector retornou HTTP 403 (sem permissão); não houve publicação no Vercel.

## Execução local

Servir a pasta app com `python -m http.server 8000 --directory app` e abrir http://localhost:8000. O backend já é remoto, portanto os dados permanecem sincronizados entre instalações do app. É necessária conexão para consultar e salvar.

## Preservação

`tools/integrity.json` contém nome, tamanho, quantidade de registros e SHA-256 dos 35 arquivos enviados. Não contém mensagens. Os originais e o índice privado permanecem no Supabase e não são publicados neste repositório. Arquivos de imagens/anexos que não acompanharam a exportação aparecem como referências dentro do conteúdo original.

`backend/index.ts` é o backend versionado. A função de importação temporária é desativada após a conferência. Não há exclusão ou edição dos originais na interface.

O link de ativação é privado e fica somente no material entregue à proprietária, fora do código público. O token de ativação é invalidado ao definir a senha. Se a senha for perdida, a recuperação exige uma ação administrativa no Supabase; não há recuperação por email nesta versão.
