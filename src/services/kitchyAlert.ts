export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface CustomAlertOptions {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  badge?: string;
  code?: string;
  link?: string;
}

type AlertCallback = (options: CustomAlertOptions | null) => void;

/**
 * KitchyAlert - Servicio Global de Alertas con Estética Premium Dark Mode.
 * 
 * Reemplaza los diálogos genéricos blancos del sistema (Alert.alert de Android)
 * por modales integrados con fondo #1C1C1E, bordes redondeados, tipografía Poppins/Inter
 * y botones de acción en Verde UCO (#00E676).
 */
export class KitchyAlert {
  private static listener: AlertCallback | null = null;

  static register(callback: AlertCallback) {
    this.listener = callback;
  }

  static unregister() {
    this.listener = null;
  }

  static show(
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: { badge?: string; code?: string; link?: string }
  ) {
    if (this.listener) {
      this.listener({
        title,
        message,
        buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'Entendido' }],
        badge: options?.badge,
        code: options?.code,
        link: options?.link,
      });
    }
  }

  static hide() {
    if (this.listener) {
      this.listener(null);
    }
  }
}

