import {
  addDependenciesToPackageJson,
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  GeneratorCallback,
  joinPathFragments,
  readWorkspaceConfiguration,
  Tree,
  updateWorkspaceConfiguration,
} from '@nrwl/devkit';
import { NxRemixGeneratorSchema } from './schema';
import { normalizeOptions } from './lib/normalize-options';
import { runTasksInSerial } from '@nrwl/workspace/src/utilities/run-tasks-in-serial';
import { execSync } from 'child_process';

export default async function (tree: Tree, _options: NxRemixGeneratorSchema) {
  const options = normalizeOptions(tree, _options);
  const tasks: GeneratorCallback[] = [];

  const workspaceConfig = readWorkspaceConfiguration(tree);
  workspaceConfig.workspaceLayout = {
    appsDir: 'packages',
    libsDir: 'packages',
  };
  updateWorkspaceConfiguration(tree, workspaceConfig);

  addProjectConfiguration(tree, options.projectName, {
    root: options.projectRoot,
    projectType: 'library',
    sourceRoot: `${options.projectRoot}/src`,
    tags: options.parsedTags,
  });

  const installTask = addDependenciesToPackageJson(
    tree,
    {
      '@remix-run/react': '^1.0.6',
      react: '^17.0.2',
      'react-dom': '^17.0.2',
      remix: '^1.0.6',
      '@remix-run/serve': '^1.0.6',
    },
    {
      '@remix-run/dev': '^1.0.6',
      '@types/react': '^17.0.24',
      '@types/react-dom': '^17.0.9',
      typescript: '^4.1.2',
    }
  );
  tasks.push(installTask);

  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files'),
    options.projectRoot,
    {
      ...options,
      tmpl: '',
    }
  );

  tree.delete('apps');
  tree.delete('libs');

  tasks.push(() => {
    execSync('npx remix setup', {
      cwd: options.projectRoot,
      stdio: [0, 1, 2],
    });
  });

  await formatFiles(tree);

  return runTasksInSerial(...tasks);
}
