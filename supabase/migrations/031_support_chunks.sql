-- 031_support_chunks.sql
-- Tabla global de conocimiento para el agente de soporte
-- Sin company_id — es contenido de la plataforma, no por empresa

CREATE TABLE IF NOT EXISTS support_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice GIN para búsqueda full-text en español (mismo approach que knowledge_chunks)
CREATE INDEX IF NOT EXISTS idx_support_chunks_content ON support_chunks
  USING gin (to_tsvector('spanish', coalesce(content, '')));

-- Seed data
INSERT INTO support_chunks (content, category) VALUES

-- Leads
('Los leads se pueden crear manualmente desde la sección "Contactos". Haz clic en "Nuevo Lead", selecciona un contacto existente o crea uno nuevo, completa los datos como presupuesto, prioridad y tipo de operación (venta/renta). El lead se asigna automáticamente al agente que lo crea, a menos que uses Round Robin.', 'leads'),

('Los leads también llegan automáticamente desde Facebook Lead Ads. Flugzz escucha el webhook de Meta y crea el lead en la empresa correspondiente. Si el Round Robin está activo, se asigna automáticamente a un agente disponible.', 'leads'),

('Cada lead tiene un pipeline con etapas configurables. Puedes arrastrar leads entre etapas desde la vista "Pipeline". Cada cambio de etapa se registra automáticamente en el historial de actividades del lead.', 'pipeline'),

-- Actividades
('En la vista de detalle del lead puedes registrar actividades: llamadas, WhatsApp, correos, visitas y notas. Cada actividad queda registrada en el timeline del lead y actualiza la fecha de última actividad, que se usa para determinar si un lead está "inactivo".', 'activities'),

('Para registrar una llamada, abre el lead y haz clic en el ícono de teléfono. Puedes marcar si fue contestada, no contestó, buzón de voz u ocupado, y agregar notas. Las llamadas sin contestar generan un registro en el timeline con el estado correspondiente.', 'activities'),

-- Round Robin
('Round Robin distribuye leads automáticamente entre los agentes de una empresa. Puedes activarlo desde Integraciones > Round Robin. Configura la cola seleccionando qué agentes participan y en qué orden. Los leads nuevos se asignan secuencialmente según el orden definido.', 'round-robin'),

('El Round Robin también permite reasignación automática por inactividad. Configura las horas de tolerancia (1-24) en Integraciones. Si un agente no registra actividad en un lead de primera etapa dentro de ese tiempo, el lead se reasigna al siguiente agente disponible.', 'round-robin'),

-- Roles
('Flugzz tiene roles jerárquicos: Director, Gerente y Agente. El Director ve todos los leads y puede reasignarlos. El Gerente ve los leads de su equipo. El Agente solo ve sus leads asignados. Los roles se configuran en Ajustes > Roles.', 'roles'),

('Puedes crear roles personalizados con permisos específicos (reasignar leads, ver pipeline completo, gestionar integraciones, etc.) desde Ajustes > Roles. Cada permiso se activa individualmente.', 'roles'),

-- Google Calendar
('Para conectar Google Calendar, ve a Integraciones > Google Calendar y haz clic en "Conectar". Se abrirá una ventana de Google para autorizar el acceso. Cada agente conecta su propia cuenta de Google.', 'calendar'),

('Una vez conectado, desde el detalle de cualquier lead puedes agendar una reunión. Elige el tipo: Llamada, Google Meet o Presencial. Si es Meet, se crea automáticamente un evento en Google Calendar con enlace de Meet. Si es presencial, puedes agregar una dirección.', 'calendar'),

('Las reuniones agendadas aparecen en la sección "Próximas reuniones" del timeline del lead. Además recibirás una notificación 1 hora antes del evento como recordatorio.', 'calendar'),

-- Suscripción
('Flugzz ofrece 3 planes: Fundación, Expansión e Imperio. Cada plan varía en número de asientos (agentes) y funcionalidades. Puedes ver los detalles y cambiar de plan en Ajustes > Suscripción.', 'subscription'),

('Al registrarte, inicia un periodo de prueba gratuito. Al finalizar, debes agregar un método de pago para continuar usando la plataforma. Los pagos se procesan vía Stripe.', 'subscription'),

-- Facebook
('Para conectar Facebook Lead Ads, ve a Integraciones > Facebook e inicia sesión con tu cuenta de Facebook. Selecciona la página y el formulario de leads que deseas conectar. Los leads llegarán automáticamente a Flugzz.', 'facebook'),

-- General
('Flugzz CRM es un sistema diseñado para inmobiliarias. Centraliza leads, automatiza asignaciones, gestiona pipelines y facilita el seguimiento de clientes. Está construido con tecnología moderna para funcionar en cualquier dispositivo.', 'general'),

('Si tienes problemas con tu cuenta o necesitas ayuda adicional, escribe a legal@flugzz.xyz o contacta a tu administrador de empresa.', 'general');
