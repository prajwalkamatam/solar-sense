const fs = require('fs');
let code = fs.readFileSync('web/src/app/page.tsx', 'utf8');

// Add import for threeui
code = code.replace(
  "import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';",
  "import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';\nimport { ConnectivityGraph } from '@designcodeio/threeui';\nimport '@designcodeio/threeui/lib-dist/style.css';"
);

// Add the background component behind the main content
code = code.replace(
  "<div className=\"min-h-screen bg-background text-foreground p-4 md:p-8 selection:bg-primary selection:text-primary-foreground\">",
  "<div className=\"min-h-screen bg-background text-foreground p-4 md:p-8 selection:bg-primary selection:text-primary-foreground relative\">\n      <div className=\"absolute inset-0 z-0 pointer-events-none opacity-20\">\n        <ConnectivityGraph />\n      </div>\n      <div className=\"relative z-10\">"
);

// Close the wrapper
code = code.replace(
  "    </div>\n  );\n}",
  "      </div>\n    </div>\n  );\n}"
);

fs.writeFileSync('web/src/app/page.tsx', code);
console.log("Patch applied successfully.");
