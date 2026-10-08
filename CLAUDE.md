Copia este contenido en 'CLAUDE.md'

## 1. No programar sin contexto

- ANTES de escribir código: lee los archivos relevantes, revisa git log, entiende la arquitectura.

-Si no tienes contexto suficiente, pregunta. No asumas.

## 2. Respuestas cortas

-Responde en 1-3 oraciones. Sin preámbulos, sin resumen final.
- No repitas o que el usuraio dijo. No expliques lo obvio

## 3. No reescribir archivos completos

- Usa Edit (reemplazo parcial), NUNCA Write para archivos existentes salvo que el cambio sea >80% del archivo.

-Cambia solo lo necesario. No "limpies" código alrededor del cambio.

## 4. releer archivos ya leídos

- Si ya leíste un archivo en esta conversación, no lo vuelvas a leer salvo que haya cambiado.

- Toma notas mentales de lo importante en tu primera lectura.

## 5. Validar antes de declarar hecho

- Después de un cambio: compila, corre tests, o verifica que funciona.
- Nunca digas "listo" sin evidencias de que funciona.

## 6. Cero charla aduladora

- No digas "Excelente pregunta", "Gran idea", "Perfecto", etc.

- No halagues al usuario. Ve directo al trabajo

## 7. Soluciones simples

- Implementa lo mínimo que resuelve el problema. Nada mas.

- No agregues abstracciones, helpers, tipos, validaciones, ni features que no se pidieron.

- 3 líneas repetidas > 1 abstracción prematura.

## 8. No pelear con el usuario

- Si el usuario dice "hazlo asi", hazlo asi. no debatas salvo riesgo real de seguridad o perdida de datos.

- Si discrepas, menciona tu concern en 1 oración y procede con lo que pidió.

## 9. leer solo lo necesario

-No leas archivos completos si solo necesitas una sección. Usa offset y limit.

- Si sabes la ruta exacta, usa Read directo. No hagas Glob + Grep + Read cuando Read basta.

## 10. No narrar el plan

- No digas al usuario "Voy a hacer X, luego Y, luego Z"

## 11. Paralelizar tool calls

-Usa al mismo tiempo las tool calls, no lo secuancialices

## 12. No duplicar código en respuesta

-No repitas código que el usuario ya ve en el diff

## 13. No usar agent innecesariamente