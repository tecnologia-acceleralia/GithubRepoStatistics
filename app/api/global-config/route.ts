import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface GlobalConfig {
  firstDayOfWeek: 'sunday' | 'monday';
}

interface RequestBody {
  action: 'load' | 'save';
  config?: GlobalConfig;
}

function getGlobalConfigFilePath(): string {
  const configDir = path.join(process.cwd(), 'configs');
  return path.join(configDir, 'global_config.json');
}

async function ensureConfigDirectory(): Promise<void> {
  const configDir = path.join(process.cwd(), 'configs');
  try {
    await fs.access(configDir);
  } catch {
    await fs.mkdir(configDir, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { action, config } = body;

    const configFilePath = getGlobalConfigFilePath();

    if (action === 'load') {
      try {
        await ensureConfigDirectory();
        const configData = await fs.readFile(configFilePath, 'utf-8');
        const parsedConfig: GlobalConfig = JSON.parse(configData);
        
        return NextResponse.json({ config: parsedConfig });
      } catch (error) {
        // If file doesn't exist, return default config
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return NextResponse.json({ 
            config: { firstDayOfWeek: 'sunday' } 
          });
        }
        throw error;
      }
    } else if (action === 'save') {
      if (!config) {
        return NextResponse.json(
          { error: 'Configuration data is required for save action' },
          { status: 400 }
        );
      }

      // Validate configuration
      if (!['sunday', 'monday'].includes(config.firstDayOfWeek)) {
        return NextResponse.json(
          { error: 'Invalid firstDayOfWeek value. Must be "sunday" or "monday"' },
          { status: 400 }
        );
      }

      await ensureConfigDirectory();
      await fs.writeFile(configFilePath, JSON.stringify(config, null, 2));
      
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "load" or "save"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Global config API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 