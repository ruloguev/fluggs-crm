-- Cleanup: eliminar toda la infraestructura de push notifications
-- Migraciones 010 y 011 fueron eliminadas del código

DROP TRIGGER IF EXISTS on_notification_created ON notifications;

DROP FUNCTION IF EXISTS send_push_on_notification();

DROP TABLE IF EXISTS push_subscriptions CASCADE;
