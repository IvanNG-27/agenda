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
          Lo que apuntas: asignaturas, tareas, exámenes, eventos, los días que marcas como estudiados y el nombre con el
          que te saluda la app. Si apuntas citas médicas o cumpleaños, eso puede incluir datos de salud o de otras
          personas: apunta solo lo que necesites.
        </p>

        <SectionHeader>Dónde</SectionHeader>
        <p>
          En este dispositivo (en el navegador o, en la app de escritorio, en la carpeta <code>%APPDATA%\Nocta</code>). Si
          inicias sesión con Google, también en Firebase (Google Cloud), asociado a tu cuenta. Solo tú puedes leerlos: las
          reglas de la base de datos impiden que otra cuenta acceda a ellos.
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

        <SectionHeader>Tus derechos</SectionHeader>
        <ul>
          <li>
            <strong>Llevártelos:</strong> Ajustes → Exportar copia.
          </li>
          <li>
            <strong>Corregirlos o borrarlos uno a uno:</strong> desde cada tarea, examen o evento.
          </li>
          <li>
            <strong>Borrarlos de este dispositivo:</strong> Ajustes → Cerrar sesión.
          </li>
          <li>
            <strong>Borrarlo todo:</strong> Ajustes → Sincronización → Borrar mi cuenta y mis datos. Se elimina al momento
            de la nube, junto con la cuenta.
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
