import jscodeshift, { ImportSpecifier } from 'jscodeshift';
const moduleName = 'Test1Module';
const modulePath = './test0/test1.module';

class NoModulesError extends Error {
	constructor() {
		super(`No NgModules found in app module.
  Are you sure you have the correct path registered in 'appModulePath'?`)
	}
}
class TooManyModulesError extends Error {
	constructor() {
		super(`More than one NgModule found in app module.
  There should be only one.`)
	}
}

/**
 * @param {string} source
 * @param {string} moduleName - ex 'MyModule'
 * @param {string} modulePath - module path relative to appModulePath, ex './thing/my.module'
 */
export function addModule(sourceText, moduleName, modulePath) {
    const source = jscodeshift.withParser('flow')(sourceText);

    const ngModules = source
        .find(jscodeshift.ClassDeclaration, path => path.decorators.some(decorator => decorator.expression.callee.name === 'NgModule'));

    if(ngModules.size() === 0) {
        throw new NoModulesError();
    }
    if(ngModules.size() > 1) {
        throw new TooManyModulesError();
    }

    const ngModuleClass = ngModules.get();
    const ngModule = ngModuleClass.value.decorators.find(decorator => decorator.expression.callee.name === 'NgModule');
    const imports = ngModule.expression.arguments[0].properties.find(prop => prop.key.name === 'imports');

    if(!imports) {
        console.info('No \'imports\' property? Strange..');
        // TODO: create
    }

    // Push module to `imports` array
    const MyModuleIdentifier = jscodeshift.identifier(moduleName);
    imports.value.elements.push(MyModuleIdentifier);

    const existingImports = source.find(ImportSpecifier);
    if(existingImports.size() === 0) {
        // TODO: Must be using some other module format
    }

    const MyModuleImport = jscodeshift.importDeclaration([jscodeshift.importSpecifier(jscodeshift.identifier(moduleName))], jscodeshift.literal(modulePath));

    // Insert after last `import {...} from '...'` statement
    jscodeshift(existingImports.at(-1).get().parent.insertAfter(MyModuleImport));

    return source.toSource({quote: 'single'});
}
