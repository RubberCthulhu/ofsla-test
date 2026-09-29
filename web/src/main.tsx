import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app';
import { hydrate, startSync, telegramBackend } from './store/cloud';
import { hasCloudStorage, initTelegram } from './telegram';
import './styles.css';

async function start() {
  const tg = await initTelegram().catch(() => null);
  if (tg && hasCloudStorage()) {
    const backend = telegramBackend(tg.CloudStorage);
    // без ответа облака работаем с локальными данными; синхронизация продолжится при следующих изменениях
    const toPush = await hydrate(backend).catch((e) => {
      console.warn('CloudStorage недоступен', e);
      return [] as string[];
    });
    startSync(backend, toPush);
  }
  registerSW({ immediate: true });
  render(<App />, document.getElementById('app')!);
}

start();
