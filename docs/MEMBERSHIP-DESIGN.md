# Membresías y Brillos: propuesta de producto

Estado: diseño, 27 de octubre de 2026. No hay cobros, cartera operativa, precios finales ni beneficios pagos habilitados. Complementa `PAYMENT-PLAN.md`; no sustituye sus decisiones pendientes. Diseño para operar en Argentina, con ARS y futura multimoneda. La elegibilidad comercial y las monedas efectivamente habilitadas deben validarse directamente ante el procesador antes de vender.

## Objetivo y límites

Ofrecer una experiencia propia centrada en historias coherentes y control del gasto. La comparación con Emochi sirve para identificar decisiones de producto; no autoriza copiar su marca, personajes, imágenes o diseño. No se promete ser superior, más barato, más rápido ni ilimitado sin mediciones comparables.

**Brillos** sería el nombre de unidades internas de uso de Nubbi. No sería dinero de curso legal, un saldo bancario, una inversión, un activo transferible ni un medio para retirar efectivo. La clasificación jurídica aplicable se debe confirmar antes de venderlos. Comprar Brillos sí implicaría pagar dinero real: la pantalla tendría que mostrar importe, moneda, impuestos, unidades y condiciones antes de aceptar. No habría conversión permanente inventada entre Brillos, tokens y USD.

No mostrar puntos ficticios como saldo del usuario. Mientras no exista el ledger de servidor, la única presentación válida es «Diseño de membresías · aún no disponible», sin balance numérico, paquetes comprables ni botones de suscripción activos. Cualquier prototipo con números deberá estar identificado como demostración sin valor y separado de producción.

## Referencias observadas y propuesta propia

Se inspeccionaron las dos capturas facilitadas por el usuario. No se copia ni documenta su saldo personal. La [guía oficial de Mochi](https://guide.emochi.com/about-mochi/mochi) confirma el uso de una unidad virtual, recargas y dos niveles de suscripción. Son descripciones comerciales, no una auditoría independiente de su funcionamiento.

| Aspecto | Capturas y referencia pública de Emochi | Propuesta Nubbi | Qué no puede afirmarse |
|---|---|---|---|
| Estructura | Captura de tres columnas: Free, Plus y Ultra. | Libre, Autor y Universo, con nombres e interfaz propios. | Que tres niveles por sí solos mejoren la experiencia. |
| Precios | La captura de planes muestra promociones de USD 3.99 y 7.49, con valores tachados de 7.99 y 14.99. La [web consultada el 27/10/2026](https://emochi.com/subscribe) muestra 9.99 y 16.99 mensuales. | Sin precios finales ni descuentos tachados inventados; validar país, costos y tratamiento de impuestos primero. | Que la captura represente precios actuales para todos los países, cuentas o plataformas. |
| Recargas | La captura muestra paquetes de 200 a 10.000 Mochi y bonificaciones de primera compra, con importes de USD 1.99 a 99.99. | Recargas opcionales de Brillos solo tras validar costos; precio final y total de unidades visibles, sin recarga automática. | Copiar esos paquetes o suponer una equivalencia monetaria para Brillos. |
| Modelos | La captura menciona seis modelos premium; la web pública consultada enumera cuatro. | Mostrar únicamente motores realmente configurados y probados, con descripción de su uso y consumo. | El número exacto o proveedor interno de los motores de Emochi, ni una calidad superior de Nubbi sin benchmark. |
| Contexto | Las referencias anuncian memoria y contexto mejorados. | Memoria guardada, edición de recuerdos y exportación gratuitas; los planes podrían ampliar presupuesto de cómputo/contexto efectivamente disponible. | Memoria perfecta, recuerdo de toda conversación o contexto infinito. |
| Beneficios | La captura combina velocidad, voz, modelos y unidades mensuales. | Beneficios limitados por capacidades reales, con cantidad y periodo publicados antes de vender. | Voz premium, colas prioritarias o cuotas mayores que aún no existan. |
| Gasto | Las capturas presentan una cartera y paquetes. | Antes de cada operación adicional: motor, consumo máximo de Brillos, saldo disponible y confirmar; historial legible. | Que hoy exista un saldo o ledger de Brillos en Nubbi. |

Los precios de la captura y de la web se consignan únicamente para explicar que difieren. No se usarán como precio de Nubbi, prueba de oferta vigente ni promesa de ahorro.

## Tres planes propuestos

| Dimensión | Libre | Autor | Universo |
|---|---|---|---|
| Para quién | Descubrir, conversar y conservar historias. | Quien desarrolla personajes y usa sesiones más extensas. | Quien utiliza con frecuencia motores y generación más costosos. |
| Base | Funciones gratuitas existentes y protecciones P1. | Todo Libre. | Todo Autor. |
| Cómputo adicional | Presupuesto gratuito finito, sujeto a capacidad disponible y límites publicados. | Asignación periódica de Brillos que se definirá tras medir costos. | Asignación mayor, también finita y por definir. |
| Texto | Motores gratuitos realmente disponibles; ajustes narrativos existentes. | Podría destinar más cómputo a contexto y respuestas extensas si el modelo lo soporta. | Podría dar acceso a motores adicionales aprobados y más presupuesto de uso. |
| Imágenes | Acceso gratuito actual con cuenta y cuota vigente, sin garantía de disponibilidad del proveedor. | Brillos para operaciones adicionales elegidas explícitamente. | Más presupuesto; no elimina límites técnicos ni políticas del proveedor. |
| Presentación | Temas, accesibilidad, personas e imágenes propias existentes. | Posibles opciones cosméticas propias, una vez implementadas. | Posibles colecciones cosméticas y pruebas opt-in, sin funciones ficticias. |
| Prioridad | Cola justa y límites de concurrencia. | Prioridad solo si se implementa y se comprueba sin bloquear indefinidamente a Libre. | Mismo principio; sin tiempos de respuesta garantizados no medidos. |
| Precio y cantidades | El acceso base permanece gratuito. | Pendientes. No vender todavía. | Pendientes. No vender todavía. |

No se cobra por recordar los hechos que la persona ya guardó, consultar su memoria, editarla, recuperar respaldos, exportar, eliminar sus datos o conservar sus historias al cancelar. Diferenciar almacenamiento de recuerdos —gratuito— del costo de reenviar un contexto mayor al modelo. No limitar la seguridad, el consentimiento o la privacidad según el plan. Pagar no habilita contenido prohibido.

No retirar beneficios gratuitos existentes para fabricar una necesidad de suscripción. Los límites de protección contra abuso y los límites de proveedores siguen vigentes y deben explicarse. Sin rachas obligatorias, premios aleatorios, saldos regalados ficticios ni avisos que presionen para pagar en medio de una escena emocional.

## Auditoría de capacidades actuales

Revisión de `server.js` y `PAYMENT-PLAN.md` sobre la rama de trabajo de esta fase:

| Capacidad actual | Comportamiento real | Consecuencia para membresías |
|---|---|---|
| Imágenes por UID | `imageQuota` es un `Map` en memoria. El valor predeterminado es cinco éxitos diarios; el presupuesto de intentos predeterminado es el doble. Las reservas pendientes cuentan contra la cuota. | Sirve como protección de una instancia, no como contabilidad comercial: reinicios y varias instancias no comparten ese estado. No vender unidades con este mecanismo. |
| Ciclo de imagen | `reserveImageQuota()` reserva antes del proveedor; `commit()`/`release()` son idempotentes en ese proceso. Fallos liberan el lugar de imagen pero consumen el presupuesto de intentos. Captura el bucket UTC original para no afectar el día siguiente. | Conservar esta semántica técnica de protección; el presupuesto de intentos no debe convertirse automáticamente en débito de Brillos por un error. |
| Concurrencia/IP | Hasta ocho solicitudes de chat y dos de imagen simultáneas por proceso; limitación por IP de 20 solicitudes de chat y cinco de imagen en una ventana de 60 segundos. | No equivalen a beneficios por usuario ni capacidad reservada de un plan. No eliminarlas por pagar. |
| Texto | Máximo de salida solicitado acotado entre 200 y 4096 tokens; allowlist de modelos del servidor. SSE retransmite la respuesta y aborta al desconectarse el cliente. | No existe medición comercial persistente de tokens, ledger de uso ni finalización durable del stream. Desconectar no garantiza que el proveedor no facture. |
| Cuenta | Las imágenes verifican sesión Firebase y rechazan cuentas anónimas. P1 mantiene estado local por UID/invitado y sincronización manual. | Una cartera futura exige UID verificado en el servidor; no se confía en email, localStorage o un plan enviado por el navegador. No migrar datos ni balances al entrar. |
| Proveedores | La disponibilidad/configuración y capacidades de imágenes se consultan por endpoints; tener una clave no certifica disponibilidad, costo real o calidad. | La asignación gratuita del proveedor es compartida y finita. No vender garantía de servicio basándose en cuotas gratuitas externas. |
| Pagos | No hay checkout, webhooks comerciales, ledger, entitlements persistentes ni wallet autoritativa. | Una vista previa debe declararse no operativa y no puede aceptar dinero. |

Los valores anteriores son defaults de código revisados, no una lectura de secretos ni certificación de todas las variables de producción. La cuota diaria de imágenes se renueva a las 00:00 UTC; una suscripción mensual futura usaría su periodo de facturación real, no ese reloj.

## Ledger autoritativo y aislamiento

El backend será la única autoridad. No guardar Brillos, plan o autorización de gasto dentro del snapshot personal de chats que el cliente puede importar. Crear colecciones privadas o tablas separadas para `wallets`, `ledgerEntries`, `reservations`, `subscriptions`, `paymentEvents` y `usageOperations`, con escrituras solo desde un servicio confiable. El usuario solo consulta sus propios movimientos autorizados. Firestore Rules actuales no se reutilizan sin diseñar y probar esta separación; este documento no modifica reglas.

Los movimientos serán inmutables, con cantidades enteras y origen verificable. Registrar `grant`, `reserve`, `commit`, `release`, `refund` y ajustes compensatorios, nunca editar retrospectivamente un movimiento. Las transferencias internas entre disponible, reservado y consumido deben cuadrar; el saldo mostrado es una proyección transaccional reconstruible del ledger. El saldo monetario de pagos/impuestos y las unidades de uso son libros distintos.

Cada asignación pertenece a un lote con UID, origen —pago, periodo del plan o promoción—, referencia externa, política de vencimiento y versión de condiciones. Mostrar por separado Brillos disponibles, reservados y cualquier vencimiento ya acordado. Las condiciones de caducidad y acumulación se decidirán antes de vender; no introducir expiración retroactiva o invisible. Propuesta inicial: evitar caducidad de recargas compradas y comunicar por adelantado cualquier vencimiento de asignaciones promocionales/periódicas, sujeto a requisitos locales.

Transacción atómica por reserva: comprobar UID autenticado, operación nueva, saldo suficiente, presupuesto de gasto y política del modelo; mover unidades de disponible a reservado y registrar la operación. Nunca permitir saldos negativos por concurrencia ni cobrar dos veces por doble clic, pestañas paralelas o reintento de red. Un `operationId` aleatorio se vincula a un hash de parámetros y a una versión de cotización: la misma clave con parámetros diferentes se rechaza.

Al cambiar de cuenta, bloquear la operación activa y dejarla asociada al UID que la inició. Un callback de la cuenta A nunca acredita ni consume saldo de B. No fusionar wallets por coincidencia de email; cualquier vinculación futura de identidades necesita un flujo específico de servidor y auditoría, separado de la importación explícita de historias P1.

## Cotización, reserve/commit/release y SSE

1. **Cotizar:** el servidor calcula un máximo de Brillos usando motor real, contexto de entrada estimado, límite de salida o tamaño/pasos de imagen. Devuelve una cotización identificada, con tarifa versionada y caducidad. El usuario ve el consumo máximo antes de confirmar. Nunca cobrar por encima de ese máximo sin una nueva aceptación.
2. **Reservar:** una transacción crea una reserva única y finita antes de llamar al proveedor. El mismo ID se reutiliza para consultar o reconectar, no para lanzar otra generación. Un cliente no elige su propio precio ni proveedor fuera de allowlist.
3. **Generar:** registrar ID del proveedor cuando exista, tiempos y consumo verificable. Reintentar lecturas o liquidaciones idempotentes, no repetir automáticamente una generación que el proveedor podría haber cobrado. Un bloqueo de políticas no cambia de motor para intentar eludirlo.
4. **Commit:** cuando exista un resultado utilizable y durable, asociarlo a la operación privada del mismo UID y consumir una sola vez el importe calculado, hasta el máximo aceptado. Liberar la diferencia reservada. No depender únicamente de un `finish` HTTP o de que el navegador diga que recibió la respuesta.
5. **Release:** errores de validación, autenticación, proveedor o resultado inutilizable no descuentan Brillos al cliente; liberar la reserva de forma idempotente. Los controles de intentos/concurrencia sí pueden impedir abuso aunque no cobren. Si el proveedor factura un fallo, es un costo que Nubbi absorbe o investiga, no un débito oculto al usuario.
6. **Incertidumbre:** ante timeout del proveedor o caída del proceso, registrar `reconciling`, mostrar el importe retenido y consultar el estado original si hay API de recuperación. Un reconciliador durable resuelve reservas huérfanas con una política de plazo visible. No liberar y regenerar a ciegas ni permitir que un callback tardío cobre una operación ya liberada; una compensación contable documenta la diferencia.

Para SSE, mantener eventos con secuencia y un resultado final recuperable durante un plazo definido y comunicado. Reconectar al mismo ID no cobra de nuevo. El consumo de entrada/contexto se mide por operación, no cada vez que el cliente vuelve a conectarse.

**Abandono y detener:** antes de un resultado final utilizable, detener cancela upstream cuando sea posible. Política propuesta: no cobrar Brillos por un stream incompleto o fallido. Guardar el fragmento solo si la persona lo solicita; no debitar después por un resultado parcial no aceptado. Si ya terminó y el resultado quedó disponible de forma durable, una desconexión posterior no convierte el trabajo en fallo ni inicia un segundo cargo. Aclararlo antes de generar. El aborto actual no demuestra que el proveedor deje de facturar: límites de tiempo, intentos y presupuesto protegen el costo del negocio. No sostener trabajo oculto indefinidamente tras cerrar el chat.

El mecanismo actual en memoria no cumple estas condiciones: requiere persistencia, estados de operación, reconciliación y pruebas antes de comercializar.

## Suscripciones, renovación y devoluciones

Checkout alojado por el procesador y autorizado por el servidor para un UID no anónimo. El retorno del navegador no concede beneficios. Verificar la autenticidad de la notificación según el producto concreto y consultar el objeto canónico del proveedor antes de acreditar. Guardar la notificación de forma durable antes de confirmar recepción; procesar con reintentos seguros.

Deduplicar tanto por `provider + eventId` como por la causa económica —pago/invoice, periodo y tipo de asignación—: dos eventos distintos sobre el mismo cobro no deben duplicar Brillos. La asignación mensual solo se concede al confirmar el cobro correcto, por una clave única de periodo, no por recargar una página ni por recibir un estado ambiguo de suscripción. Eventos tardíos o fuera de orden no reducen un periodo nuevo a uno anterior ni reviven una suscripción cancelada. Conciliar periódicamente pagos, periodos, asignaciones y devoluciones.

No iniciar cobros ahora. Diseño propuesto: ningún método guardado, recarga automática o renovación recurrente se autoriza por defecto. Si luego se ofrece renovación automática, debe existir consentimiento explícito, importe/moneda/periodo visibles y control para desactivarla. Una recarga de Brillos nunca habilita por sí sola auto-recarga. A falta de consentimiento de renovación, la membresía termina al vencer el periodo contratado y se ofrece renovar manualmente.

Cancelación accesible desde la cuenta, con fecha de finalización y comprobante. No borrar historias ni bloquear exportación al cancelar o ante un pago rechazado. Propuesta de downgrade: conservar lo pagado hasta su fin, retirar solo beneficios futuros y mantener Libre. Para upgrades, mostrar precio y prorrateo calculados por el procesador antes de aceptar; no inventar facturas o diferencias en el navegador.

Reembolsos/contracargos generan movimientos compensatorios ligados al pago original. Revisar los lotes afectados; no tomar saldo de otra cuenta ni crear un débito automático para cubrir Brillos ya gastados. Un estado en disputa puede suspender beneficios comerciales pendientes conforme a términos claros, pero no retener historias personales como garantía de pago. Mantener recibos e historial de ajustes, soporte y conciliación. Política final de reembolso y conservación de documentación pendiente del país y producto.

## Costos y cantidades antes de fijar precios

Medir sesiones sintéticas representativas y, posteriormente, métricas de uso consentidas sin guardar contenido privado innecesario. Por operación: motor y versión, tokens de entrada/salida realmente facturados, contexto reenviado, caché si el proveedor la factura distinto, tamaño/pasos de imagen, latencia, interrupciones, reintentos, almacenamiento y costo de infraestructura. Separar costo teórico de tarifas, cuota gratuita y factura conciliada.

Modelo de costo: entrada + salida + imágenes/voz realmente consumidas + infraestructura proporcional + costos del procesador/impuestos/reembolsos + reserva por fallos. Los valores deben venir de tarifas verificadas y facturas, no de una equivalencia inventada «un mensaje = un costo». Un mensaje largo o una ventana de contexto mayor puede costar más; definir cotizaciones y presupuestos máximos para evitar sorpresas.

Estimar distribución de consumo y fallos, no solo promedio; simular usuarios intensivos, cambios de modelo, conversaciones largas, múltiples pestañas y cancelaciones. Configurar límites mensuales de costo del negocio y por plan. Al agotarse un presupuesto, ofrecer seguir en Libre o esperar la renovación; nunca cargar automáticamente una tarjeta ni degradar el modelo en secreto. Publicar el motor efectivo y cualquier fallback opt-in.

No fijar número de Brillos incluidos, conversiones, precios, velocidad prometida o límite de contexto hasta completar esas mediciones y validar capacidad. Las mejoras de coherencia narrativa deben evaluarse por separado de la longitud: pagar por más tokens no garantiza una historia mejor.

## Pasarelas: operación en Argentina

Diseño para operar en Argentina. Propuesta condicionada: Mercado Pago para ARS; evaluar PayPal para clientes internacionales después de verificar habilitación y costos. Argentina no figura actualmente en la lista de países admitidos para alta directa de Stripe Payments; disponibilidad de Global Payouts, Connect o Money Management no equivale a poder cobrar para un comerciante radicado en Argentina. No crear entidades extranjeras ni usar domicilios ajenos para eludir requisitos. Verificar el producto de ficción y romance no gráfico con cada procesador antes de vender. Este diseño no acepta contratos ni certifica elegibilidad.

- Stripe documenta webhooks para el ciclo de suscripción e idempotencia de API. Su capa de idempotencia no reemplaza el ledger permanente de Nubbi; la documentación indica que las claves de API v1 pueden eliminarse tras al menos 24 horas. Mantener deduplicación propia por causa económica y consultar [disponibilidad por país](https://stripe.com/global).
- Mercado Pago documenta suscripciones y notificaciones, pero la guía actual distingue configuración por producto: la configuración genérica por «Tus integraciones» no aplica de la misma forma a Suscripciones. Seguir el flujo específico y sus validaciones cuando se elija el producto; no copiar un webhook genérico sin comprobarlo.
- No guardar números de tarjeta, secretos de pago o datos financieros dentro de historias, prompts, registros públicos o snapshots P1. No cobrar a testers para probar la integración.

## Condiciones para pasar de diseño a producto

- Validar la condición fiscal y elegibilidad del titular argentino, monedas reales, términos y cancelación/reembolso. La documentación de alta se presenta directamente al procesador cuando corresponda.
- Implementar y auditar backend de ledger/transacciones, reglas de acceso por UID, cotizaciones versionadas, presupuesto y reconciliación.
- Probar en entorno de prueba compras, renovación, rechazo, duplicados, eventos fuera de orden, firmas inválidas, reembolsos, contracargos, vencimiento y cambios de cuenta; sin cobros reales.
- Probar generaciones concurrentes, fallos de proveedor, imágenes inválidas, SSE interrumpido/reconectado, doble clic, caída del servidor y callback tardío. Nunca duplicar generación o débito.
- Verificar que Libre, memoria, personas, recuperación, exportación y sincronización manual P1 sigan funcionando sin comprar nada.
- Medir costos y calidad, definir precios y cantidades reales, revisar textos comerciales y accesibilidad de cancelación; recién entonces solicitar la aprobación final para activar cobros.

## Fuentes primarias consultadas

- [Emochi: Mochi y membresías](https://guide.emochi.com/about-mochi/mochi).
- [Emochi: suscripciones públicas, lectura del 27/10/2026](https://emochi.com/subscribe). Los importes pueden diferir de las capturas y variar después.
- [Stripe: ciclo de suscripciones por webhooks](https://docs.stripe.com/billing/subscriptions/webhooks).
- [Stripe: idempotencia](https://docs.stripe.com/api/idempotent_requests).
- [Stripe: webhooks, autenticación, duplicados y orden de eventos](https://docs.stripe.com/webhooks).
- [Stripe: disponibilidad global](https://stripe.com/global).
- [Mercado Pago: suscripciones](https://www.mercadopago.com.ar/developers/es/docs/subscriptions/overview).
- [Mercado Pago: webhooks y diferencias por integración](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks).

Las capturas del usuario se inspeccionaron como referencia puntual. No se copiaron al repositorio ni se reprodujo su saldo. Las fuentes comerciales describen productos y APIs; no prueban superioridad de Nubbi, licencias de todos sus motores o aprobación comercial del negocio.

La guía complementaria de esta fase es outputs/Guia-cobros-Nubbi-Argentina.md en el espacio de trabajo. Distingue moneda mostrada, cobrada y liquidada; no activa cobros ni promete anonimato comercial.


