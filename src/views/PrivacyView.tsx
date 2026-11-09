import { SectionHeader } from '../components/Common';
import { Icon } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';
import { href } from '../ui';

/** Información de privacidad (RGPD): qué se guarda, dónde, con quién y cómo borrarlo. */
export function PrivacyView({ desktop }: { desktop: boolean }) {
  return (
    <main className={desktop ? 'main main--narrow' : 'page'}>
      <a className="back" href={href({ name: 'ajustes' })}>
        <Icon name="izq" size={16} />
        Ajustes
      </a>
      <PageHeader title="Privacidad" />

      <section className="privacy">
        <SectionHeader>Qué se guarda</SectionHeader>
        <p>
          Lo que apuntas: asignaturas, tareas, exámenes, eventos, notas, los días que marcas como estudiados y el nombre
          con el que te saluda la app. Si apuntas citas médicas o cumpleaños, eso puede incluir datos de salud o de otras
          personas: apunta solo lo que necesites.
        </p>

        <SectionHeader>Dónde</SectionHeader>
        <p>
          En este dispositivo (en el navegador o, en la app de escritorio, en la carpeta <code>%APPDATA%\Nocta</code>). Si
          inicias sesión con Google, también en Firebase (Google Cloud), asociado a tu cuenta. Solo tú puedes leerlos: las
          reglas de la base de datos impiden que otra cuenta acceda a ellos. Lo único que ven otras personas es lo que
          apuntas dentro de un grupo (más abajo).
        </p>

        <SectionHeader>Con quién</SectionHeader>
        <p>
          Con nadie más. Nocta no tiene publicidad, analítica ni cookies de seguimiento. Los únicos proveedores son Google
          (inicio de sesión y base de datos, solo si inicias sesión) y GitHub (aloja la web y las descargas).
        </p>
        <p>
          Si activas las notificaciones con la sesión iniciada, el título y la fecha de cada recordatorio pendiente se
          guardan en tu cuenta y se envían a tus dispositivos a través de Firebase Cloud Messaging (Google) y de un proceso
          automático de GitHub. Se borran en cuanto se envían. Al cerrar sesión, ese dispositivo deja de recibirlos.
        </p>

        <SectionHeader>Grupos</SectionHeader>
        <p>
          Los grupos (solo en la web, con la sesión iniciada) son calendarios compartidos. Lo que apuntas dentro de un
          grupo (asignaturas, tareas, exámenes, eventos y notas) lo ven todos sus miembros, y también ven el nombre de tu
          cuenta de Google (o, si no tiene, el que pusiste en Ajustes) en la lista de miembros. Tu agenda personal sigue
          siendo solo tuya: nada pasa a un grupo si no lo eliges al apuntarlo.
        </p>
        <ul>
          <li>
            <strong>Quién edita:</strong> quien crea el grupo lo administra. Los demás entran como lectores (ven todo, no
            cambian nada) hasta que les da permiso para editar.
          </li>
          <li>
            <strong>Invitaciones:</strong> se entra con un código de 10 caracteres que crea quien administra. Caduca a los 7
            días y deja de servir si crea otro. Cualquiera que lo tenga puede unirse como lector, así que compártelo solo
            con quien quieras. Quien administra puede quitar a cualquier miembro; al hacerlo, el código deja de servir.
          </li>
          <li>
            <strong>Tareas hechas:</strong> marcar como hecha una tarea del grupo solo cambia para ti. Se guarda en tu
            cuenta, no en el grupo, y los demás miembros no lo ven.
          </li>
          <li>
            <strong>Recordatorios:</strong> los avisos de un elemento del grupo los reciben todos sus miembros que tengan
            las notificaciones activadas.
          </li>
          <li>
            <strong>Salir:</strong> al salir de un grupo (o si te quitan) deja de estar en tus dispositivos. Lo que
            apuntaste en él se queda en el grupo.
          </li>
          <li>
            <strong>Borrar:</strong> quien administra puede borrar el grupo, y con él todo lo que contiene, para todos.
          </li>
          <li>
            <strong>Copias de seguridad:</strong> la copia que exportas solo incluye tu agenda personal, no lo de los
            grupos.
          </li>
        </ul>

        <SectionHeader>Tus derechos</SectionHeader>
        <ul>
          <li>
            <strong>Llevártelos:</strong> Ajustes → Exportar copia.
          </li>
          <li>
            <strong>Corregirlos o borrarlos uno a uno:</strong> desde cada tarea, examen, evento o nota.
          </li>
          <li>
            <strong>Borrarlos de este dispositivo:</strong> Ajustes → Cerrar sesión.
          </li>
          <li>
            <strong>Borrarlo todo:</strong> Ajustes → Sincronización → Borrar mi cuenta y mis datos. Se elimina al momento
            de la nube, junto con la cuenta. Los grupos que administras se borran enteros; de los demás sales (lo que
            apuntaste en ellos se queda en el grupo; bórralo antes si no quieres que siga ahí).
          </li>
        </ul>
        <p>
          Los datos se guardan hasta que los borras. Para cualquier duda, abre una incidencia en{' '}
          <a className="inline-link" href="https://github.com/IvanNG-27/agenda/issues" target="_blank" rel="noopener noreferrer">
            github.com/IvanNG-27/agenda
          </a>
          .
        </p>
      </section>
    </main>
  );
}
