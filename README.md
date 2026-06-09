# Projeto3-front

## Fluxo Web + Desktop

O login web autentica o usuário na API e, se houver um desktop pareado, o backend enfileira o comando `START_MONITORING` para o agente local.

O fluxo usa os endpoints autenticados da API para:

- registrar o desktop com `device_id` e `agent_token`
- renovar o token do dispositivo
- enviar heartbeat periódico
- buscar comandos pendentes
- confirmar a execução do comando no agente

Na interface web, o dashboard consulta `/desktop/devices/status` para exibir:

- conectado
- monitorando
- desconectado
- último heartbeat
- versão do agente

Se o desktop estiver offline, o comando permanece pendente até o agente voltar a se conectar.

