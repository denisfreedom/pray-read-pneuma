14:11:37.350 Running build in Washington, D.C., USA (East) – iad1
14:11:37.350 Build machine configuration: 2 cores, 8 GB
14:11:37.493 Cloning github.com/denisfreedom/pray-read-pneuma (Branch: main, Commit: cf79de6)
14:11:40.198 Cloning completed: 2.705s
14:11:40.231 Found .vercelignore
14:11:40.242 Removed 16 ignored files defined in .vercelignore
14:11:40.242   /public/BULK_IMPORT_GUIDE.md
14:11:40.242   /public/BULK_IMPORT_READY.md
14:11:40.242   /public/BULK_IMPORT_TEST_GUIDE.md
14:11:40.242   /public/CHATGPT_PROMPTS.md
14:11:40.242   /public/FULL_JSON_TEMPLATE_WITH_CROSS_REFERENCES.json
14:11:40.242   /public/IMPORT_SETUP_COMPLETE.md
14:11:40.242   /public/JSON_BULK_IMPORT_FORMAT.md
14:11:40.242   /public/QUICK_START_CHAPTER_UPLOAD.txt
14:11:40.242   /public/SINGLE_CHAPTER_JSON_TEMPLATE.json
14:11:40.242   /public/test-genesis-kjv-complete.json
14:11:40.340 Restored build cache from previous deployment (HEarnin5cvEeybMLoh6RKbyDV9Us)
14:11:42.297 Running "vercel build"
14:11:42.313 Vercel CLI 66.2.0
14:11:42.699 Warning: Due to "engines": { "node": ">=18.17.0" } in your `package.json` file, the Node.js Version defined in your Project Settings ("22.x") will not apply, Node.js Version "26.x" will be used instead. Learn More: https://vercel.link/node-version
14:11:42.710 Warning: Detected "engines": { "node": ">=18.17.0" } in your `package.json` that will automatically upgrade when a new major Node.js Version is released. Learn More: https://vercel.link/node-version
14:11:42.710 Installing dependencies...
14:11:43.543 npm warn Unknown env config "cache-dir". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
14:11:43.804 
14:11:43.804 up to date in 747ms
14:11:43.804 
14:11:43.804 38 packages are looking for funding
14:11:43.804   run `npm fund` for details
14:11:43.805 npm warn install-scripts 1 package has install scripts not yet covered by allowScripts:
14:11:43.805 npm warn install-scripts   sharp@0.34.5 (install: node install/check.js || npm run build)
14:11:43.805 npm warn install-scripts
14:11:43.805 npm warn install-scripts Run `npm install-scripts ls` to review, or `npm install-scripts approve <pkg>` to allow.
14:11:43.840 Detected Next.js version: 15.5.14
14:11:43.845 Running "npm run build"
14:11:43.966 npm warn Unknown env config "cache-dir". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
14:11:43.990 
14:11:43.990 > web-app@1.0.0 build
14:11:43.991 > next build
14:11:43.991 
14:11:45.357    ▲ Next.js 15.5.14
14:11:45.357 
14:11:45.413    Creating an optimized production build ...
14:11:53.077 Failed to compile.
14:11:53.077 
14:11:53.077 ./app/api/offline-sync/route.ts
14:11:53.077 Error:   x Expected '>', got 'className'
14:11:53.077     ,-[/vercel/path0/app/api/offline-sync/route.ts:70:1]
14:11:53.078  67 |   };
14:11:53.078  68 | 
14:11:53.078  69 |   return (
14:11:53.078  70 |     <div className="bg-white rounded-2xl shadow-xl p-6">
14:11:53.078     :          ^^^^^^^^^
14:11:53.078  71 |       <div className="flex items-center justify-between">
14:11:53.078  72 |         <h2 className="text-xl font-bold" style={{color:'#17372f'}}>Offline Content</h2>
14:11:53.078  73 |         <button onClick={onClose} className="text-2xl leading-none px-2">×</button>
14:11:53.078     `----
14:11:53.078 
14:11:53.078 Caused by:
14:11:53.078     Syntax Error
14:11:53.078 
14:11:53.078 Import trace for requested module:
14:11:53.078 ./app/api/offline-sync/route.ts
14:11:53.078 
14:11:53.080 
14:11:53.081 > Build failed because of webpack errors
14:11:53.122 Error: [BUILD_UTILS_SPAWN_1] Command "npm run build" exited with 1
