# Diseño futuro de suscripciones

No se implementan cobros, planes vendidos ni acceso condicionado en esta fase. Primero se valida la experiencia, retención y costo real por sesión. No se promete generación ilimitada ni se pone un precio sin conocer costos y elegibilidad del negocio.

## Decisiones antes de integrar

Confirmar país y entidad del comerciante, moneda, facturación/impuestos, política de cancelación y reembolso, soporte y producto admitido por la pasarela. La zona horaria del usuario no establece domicilio fiscal. Mercado Pago es una opción a evaluar para un comerciante elegible en Argentina; Stripe depende de disponibilidad en el país de la entidad. Las políticas del procesador son independientes de que una actividad sea legal: no asumir que admite venta de contenido adulto. No crear cuentas, aceptar contratos ni activar pagos reales durante este diseño.

## Arquitectura propuesta

1. Checkout alojado por la pasarela, siempre vinculado al UID Firebase verificado por el servidor. No guardar números de tarjeta en Nubbi.
2. Webhook con firma verificada y consulta posterior del objeto de pago en la API del proveedor. Una URL de retorno del navegador nunca habilita beneficios.
3. Registro persistente de eventos con idempotencia y transacciones; tolerar duplicados, reintentos y eventos fuera de orden. Ledger de pagos separado del historial personal de chats.
4. Entitlements privados por UID, escritos solo por servidor, con inicio/fin y estado. El cliente no puede otorgarse suscripción. No reutilizar la cuota en memoria actual para contabilidad o beneficios pagos.
5. Cuotas persistentes y reservas atómicas por operación; liberar reservas fallidas. Definir presupuesto por plan según costo real de modelos, latencia y margen, sin modificar políticas de contenido por haber pagado.
6. Cancelación accesible, aviso previo de precio/renovación, historial de recibos, estados pendientes/rechazados y expiración verificable. Conservar acceso a exportar datos; una cancelación no borra historias.

## Pruebas obligatorias antes de vender

Sandbox: compra, renovación, rechazo, cancelación, reembolso, contracargo, webhook falsificado/repetido/tardío, expiración, cambio de cuenta y reinicio del servidor. Conciliación de ledger contra proveedor, permisos Firestore y medición de costo por chat/imagen. Después, revisión de condiciones comerciales y elegibilidad del negocio con el procesador; no cobrar a testers como prueba.

Fuentes consultadas el 27/10/2026:
- [Mercado Pago Suscripciones](https://www.mercadopago.com.ar/developers/es/docs/subscriptions/overview).
- [Mercado Pago Webhooks y firma](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks).
- [Stripe: países disponibles](https://stripe.com/global).
- [Stripe: negocios restringidos/prohibidos](https://stripe.com/legal/restricted-businesses).

Este documento define implementación y decisiones pendientes; no constituye certificación legal, tributaria ni aprobación del procesador.
