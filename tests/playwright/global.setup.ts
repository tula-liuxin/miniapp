import { createApiContext, waitForServer } from './helpers/api';

async function globalSetup() {
  const api = await createApiContext();

  try {
    await waitForServer(api);
  } finally {
    await api.dispose();
  }
}

export default globalSetup;
