import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';
import axios from 'axios';

interface AIResponse {
  message: string;
  confidence: number;
  requiresHuman: boolean;
  suggestedActions?: string[];
}

interface FAQItem {
  keywords: string[];
  response: string;
  confidence: number;
  actions?: string[];
}

interface AIConfig {
  provider: 'openai' | 'claude' | 'faq';
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  fallbackToFAQ?: boolean;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface ClaudeResponse {
  content: Array<{
    text: string;
  }>;
}

class AISupportService {
  private faqs: FAQItem[] = [
    // Existing FAQs remain the same
    {
      keywords: ['balance', 'saldo', 'dinero', 'cuanto tengo', 'mi balance'],
      response: '💰 Para consultar tu balance actual, usa el comando /balance o accede a tu panel de control en https://profitagent.app\n\n📊 También puedes configurar alertas automáticas de balance con /notifications',
      confidence: 0.9,
      actions: ['/balance', 'Ver panel']
    },
    {
      keywords: ['retiro', 'retirar', 'withdrawal', 'sacar dinero', 'como retiro'],
      response: '🏦 **Proceso de Retiro:**\n\n1️⃣ Accede a tu panel de control\n2️⃣ Ve a la sección "Retiros"\n3️⃣ Ingresa el monto y tu wallet\n4️⃣ Confirma con el código OTP que recibirás aquí\n\n⚡ Los retiros se procesan en 2-24 horas hábiles.',
      confidence: 0.95,
      actions: ['Ver panel', '/status']
    },
    {
      keywords: ['otp', 'codigo', 'verificacion', 'autenticacion', 'no recibo codigo'],
      response: '🔐 **Códigos OTP:**\n\n• Los códigos se envían automáticamente para retiros\n• Válidos por 10 minutos\n• Si no recibes el código, verifica que tu cuenta esté vinculada\n\n🔗 Usa /link si necesitas vincular tu cuenta',
      confidence: 0.9,
      actions: ['/link', '/status']
    },
    {
      keywords: ['vincular', 'link', 'conectar cuenta', 'asociar telegram'],
      response: '🔗 **Vincular Cuenta:**\n\n1️⃣ Usa el comando /link\n2️⃣ Sigue las instrucciones\n3️⃣ Ingresa tu email de ProFitAgent\n\n✅ Una vez vinculada, recibirás:\n• Códigos OTP para retiros\n• Notificaciones de trading\n• Alertas de balance',
      confidence: 0.95,
      actions: ['/link']
    },
    {
      keywords: ['trading', 'bot', 'estrategia', 'ganancias', 'como funciona', 'agentes', 'arbitraje', 'surebet'],
      response: '🤖 **8 Agentes IA de ProFitAgent:**\n\n🎯 **1 Agente Orquesta** + **7 Agentes Esenciales** operando 24/7\n💎 **Arbitraje Cripto BSC** + **Surebet Deportivo** simultáneo\n📊 **8% diario garantizado** por 25 días = 200% retorno total\n🔄 **100% autónomo** bajo contratos inteligentes auditados\n\n🎯 Usa /status para ver el estado de tus agentes',
      confidence: 0.9,
      actions: ['/status', 'Ver panel']
    },
    {
      keywords: ['problema', 'error', 'no funciona', 'ayuda', 'soporte'],
      response: '🆘 **Soporte ProFitAgent:**\n\n🤖 **ARIA (Asistente IA)**: Disponible 24/7 para consultas inmediatas\n📝 Describe tu problema detalladamente aquí mismo\n📧 Incluye tu email de registro si es necesario\n⚡ **Soporte Técnico Humano**: 2-4 horas para casos complejos\n🔧 **Operación Autónoma**: Los 8 agentes IA resuelven la mayoría de problemas automáticamente\n\n🔧 Para escalamiento humano, usa /support',
      confidence: 0.8,
      actions: ['/support', '/help']
    },
    {
      keywords: ['precio', 'costo', 'plan', 'licencia', 'cuanto cuesta'],
      response: '💎 **Licencias de Acceso a Agentes IA:**\n\n🔹 **Básica**: $500 - Acceso compartido a los 8 agentes\n🔹 **Estándar**: $1,000 - Prioridad media\n🔹 **Premium**: $2,500 - Prioridad alta\n🔹 **Elite**: $5,000 - Recursos dedicados\n🔹 **Enterprise**: $10,000 - Acceso completo VIP\n\n📋 **8% diario garantizado** por 25 días\n💰 Consulta tu licencia actual con /status',
      confidence: 0.95,
      actions: ['/status', 'Ver licencias']
    },
    {
      keywords: ['seguridad', 'seguro', 'confiable', 'riesgo'],
      response: '🛡️ **Seguridad ProFitAgent:**\n\n🔐 **Contratos Inteligentes Auditados** - Operación 100% transparente\n🤖 **8 Agentes IA Autónomos** - Sin intervención humana\n🏦 **Fondos Seguros BSC** - Wallets verificadas y auditadas\n📊 **Transparencia Total** - Todas las operaciones son públicas\n⚡ **Retiros Automáticos** - Procesados por agentes IA\n\n🔍 Revisa tu actividad con /status',
      confidence: 0.9,
      actions: ['/status', '/notifications']
    },
    {
      keywords: ['horario', 'cuando', 'tiempo', 'disponible'],
      response: '⏰ **Disponibilidad ProFitAgent:**\n\n🤖 **8 Agentes IA operan 24/7/365** - Sin parar nunca\n💎 **Arbitraje Continuo** - Cripto BSC + Surebet deportivo\n🔄 **Retiros Automáticos** - 8% diario procesado automáticamente\n💬 **Soporte ARIA**: Disponible 24/7 vía Telegram\n📧 **Soporte Técnico**: Respuestas en 2-4 horas',
      confidence: 0.9
    },
    {
      keywords: ['configurar', 'configuracion', 'ajustes', 'personalizar'],
      response: '⚙️ **Configuración:**\n\n🔔 Notificaciones: /notifications\n🔗 Vincular cuenta: /link\n📊 Ver estado: /status\n💰 Consultar balance: /balance\n\n🎛️ Configuración avanzada disponible en el panel web',
      confidence: 0.8,
      actions: ['/notifications', '/status', 'Ver panel']
    }
  ];

  // Obtener configuración de IA desde variables de entorno y base de datos
  private async getAIConfig(): Promise<AIConfig> {
    try {
      // Obtener configuración desde variables de entorno
      const envConfig = {
        provider: (process.env.AI_PROVIDER as 'openai' | 'claude') || 'faq',
        apiKey: process.env.AI_PROVIDER === 'openai' ? process.env.OPENAI_API_KEY : process.env.CLAUDE_API_KEY,
        model: process.env.AI_MODEL || 'gpt-3.5-turbo',
        maxTokens: parseInt(process.env.AI_MAX_TOKENS || '500'),
        temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
        fallbackToFAQ: process.env.AI_FALLBACK_TO_FAQ === 'true'
      };

      // Obtener configuración desde la base de datos (override de env)
      const dbSettings = await prisma.setting.findMany({
        where: {
          key: {
            in: ['ai_enabled', 'ai_max_tokens', 'ai_temperature', 'ai_system_prompt']
          }
        }
      });

      const settings = dbSettings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as any);

      // Si la IA no está habilitada en DB o no hay API key, usar FAQs
      if (settings.ai_enabled !== 'true' || !envConfig.apiKey) {
        return { provider: 'faq' };
      }

      // Combinar configuración
      return {
        provider: envConfig.provider,
        apiKey: envConfig.apiKey,
        model: envConfig.model,
        maxTokens: parseInt(settings.ai_max_tokens as string) || envConfig.maxTokens,
        temperature: parseFloat(settings.ai_temperature as string) || envConfig.temperature,
        fallbackToFAQ: envConfig.fallbackToFAQ
      };
    } catch (error) {
      logger.error('Error getting AI config:', error);
      return { provider: 'faq' };
    }
  }

  // Llamar a la API de OpenAI
  private async callOpenAI(message: string, config: AIConfig): Promise<string> {
    try {
      const systemPrompt = await this.getSystemPrompt();
      
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: config.model || 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: message
            }
          ],
          max_tokens: config.maxTokens || 500,
          temperature: config.temperature || 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const openaiResponse = response.data as OpenAIResponse;
      return openaiResponse.choices[0]?.message?.content || 'Lo siento, no pude generar una respuesta.';
    } catch (error) {
      logger.error('Error calling OpenAI API:', error);
      throw error;
    }
  }

  // Llamar a la API de Claude
  private async callClaude(message: string, config: AIConfig): Promise<string> {
    try {
      const systemPrompt = await this.getSystemPrompt();
      
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: config.model || 'claude-3-haiku-20240307',
          max_tokens: config.maxTokens || 500,
          temperature: config.temperature || 0.7,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: message
            }
          ]
        },
        {
          headers: {
            'x-api-key': config.apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          timeout: 30000
        }
      );

      const claudeResponse = response.data as ClaudeResponse;
      return claudeResponse.content[0]?.text || 'Lo siento, no pude generar una respuesta.';
    } catch (error) {
      logger.error('Error calling Claude API:', error);
      throw error;
    }
  }

  // Obtener el prompt del sistema desde la base de datos
  private async getSystemPrompt(): Promise<string> {
    try {
      const setting = await prisma.setting.findUnique({
        where: { key: 'ai_system_prompt' }
      });
      
      return (setting?.value as string) || `Eres ARIA, el asistente de IA de ProFitAgent, una plataforma de arbitraje automatizado con 8 agentes IA especializados.

**IDENTIDAD Y PERSONALIDAD:**
- Nombre: ARIA (Asistente de Respuesta Inteligente Automatizada)
- Personalidad: Profesional, empática, confiable y orientada a resultados
- Tono: Amigable pero experto, usa emojis apropiados para trading/finanzas

**CONOCIMIENTO ESPECÍFICO:**
- ProFitAgent es una plataforma de arbitraje automatizado con 8 agentes IA especializados
- Licencias: Básica ($500), Estándar ($1,000), Premium ($2,500), Elite ($5,000), Enterprise ($10,000)
- Especialización: Arbitraje cripto BSC + Surebet deportivo simultáneo
- Operación: 100% autónoma bajo contratos inteligentes, sin administradores
- Retornos: 8% diario garantizado por 25 días = 200% total
- Agentes: 1 Orquesta + 7 Esenciales operando 24/7
- Soporte: 100% automatizado vía ARIA, sin intervención humana

**COMANDOS DISPONIBLES:**
- /start - Iniciar conversación
- /help - Mostrar ayuda
- /status - Estado del bot y cuenta
- /balance - Consultar balance
- /link - Vincular cuenta Telegram
- /support - Contactar soporte humano
- /notifications - Configurar alertas

**REGLAS DE RESPUESTA:**
1. SIEMPRE mantente dentro del contexto de ProFitAgent
2. NO proporciones consejos financieros específicos
3. Deriva consultas técnicas complejas a soporte humano
4. Usa las FAQs como base pero personaliza según el contexto
5. Incluye acciones sugeridas relevantes cuando sea apropiado
6. Mantén respuestas concisas pero informativas
7. Si no sabes algo, admítelo y ofrece alternativas

**LIMITACIONES:**
- NO puedes ejecutar operaciones de trading
- NO puedes acceder a datos de cuenta específicos
- NO puedes procesar retiros o depósitos
- NO proporciones consejos de inversión personalizados

Responde siempre como ARIA, manteniendo la coherencia con la marca ProFitAgent.`;
    } catch (error) {
      logger.error('Error getting system prompt:', error);
      return 'Eres ARIA, el asistente de IA de ProFitAgent. Responde de manera profesional y útil sobre nuestra plataforma de trading automatizado.';
    }
  }

  async generateResponse(message: string, userId: number): Promise<AIResponse> {
    try {
      const config = await this.getAIConfig();
      let aiResponse: string | null = null;
      
      // Intentar usar API externa si está configurada
      if (config.provider !== 'faq' && config.apiKey) {
        try {
          if (config.provider === 'openai') {
            aiResponse = await this.callOpenAI(message, config);
          } else if (config.provider === 'claude') {
            aiResponse = await this.callClaude(message, config);
          }
          
          if (aiResponse) {
            return {
              message: aiResponse,
              confidence: 0.9,
              requiresHuman: false,
              suggestedActions: ['/status', '/balance']
            };
          }
        } catch (error) {
          logger.error(`Error with ${config.provider} API:`, error);
          
          // Si no se debe hacer fallback a FAQ, devolver error
          if (!config.fallbackToFAQ) {
            return {
              message: '❌ Error temporal del sistema de IA. Un agente te contactará pronto.',
              confidence: 0.1,
              requiresHuman: true
            };
          }
        }
      }
      
      // Fallback a FAQs (sistema original)
      const normalizedMessage = message.toLowerCase();
      
      // Buscar en FAQs
      for (const faq of this.faqs) {
        for (const keyword of faq.keywords) {
          if (normalizedMessage.includes(keyword.toLowerCase())) {
            return {
              message: faq.response,
              confidence: faq.confidence,
              requiresHuman: faq.confidence < 0.7,
              suggestedActions: faq.actions || []
            };
          }
        }
      }

      // Si no encuentra respuesta en FAQs
      return {
        message: '🤖 Gracias por tu consulta. Un agente humano te ayudará pronto.\n\n📞 Mientras tanto, puedes:\n• Revisar tu estado: /status\n• Ver notificaciones: /notifications\n• Consultar balance: /balance',
        confidence: 0.3,
        requiresHuman: true,
        suggestedActions: ['/status', '/notifications', '/balance']
      };
    } catch (error) {
      logger.error('Error generating AI response:', error);
      return {
        message: '❌ Error temporal del sistema. Un agente te contactará pronto.',
        confidence: 0.1,
        requiresHuman: true
      };
    }
  }

  async logAIInteraction(userId: number, userMessage: string, aiResponse: AIResponse): Promise<void> {
    try {
      await prisma.telegramInteraction.create({
        data: {
          user_id: userId.toString(),
          interaction_type: 'message',
          content: userMessage,
          response: aiResponse.message,
          metadata: {
            type: 'ai_response',
            confidence: aiResponse.confidence,
            requiresHuman: aiResponse.requiresHuman,
            suggestedActions: aiResponse.suggestedActions
          }
        }
      });
    } catch (error) {
      logger.error('Error logging AI interaction:', error);
    }
  }

  // Método para agregar nuevas FAQs dinámicamente
  async addFAQ(keywords: string[], response: string, confidence: number = 0.8): Promise<void> {
    this.faqs.push({
      keywords,
      response,
      confidence
    });
  }

  // Método para obtener estadísticas de uso
  async getAIStats(): Promise<any> {
    try {
      const count = await prisma.telegramInteraction.count({
        where: {
          metadata: {
            path: ['type'],
            equals: 'ai_response'
          },
          timestamp: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Últimos 7 días
          }
        }
      });

      return {
        totalAIResponses: count,
        period: '7 days'
      };
    } catch (error) {
      logger.error('Error getting AI stats:', error);
      return { totalAIResponses: 0, period: '7 days' };
    }
  }
}

export const aiSupportService = new AISupportService();