import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			gray: {
  				750: '#374151',
  				850: '#1F2937',
  				950: '#0F172A',
  			},
  			vscode: {
  				bg: '#1e1e1e',
  				sidebar: '#252526',
  				panel: '#2d2d30',
  				border: '#3e3e42',
  				text: '#cccccc',
  				comment: '#6a9955',
  				keyword: '#569cd6',
  				string: '#ce9178',
  				number: '#b5cea8',
  				function: '#dcdcaa',
  				tag: '#f44747'
  			}
  		},
  		borderColor: {
  			DEFAULT: 'hsl(var(--border))',
  			'gray-750': '#374151',
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'shimmer': {
  				'0%': {
  					transform: 'translateX(-100%)',
  					opacity: '0'
  				},
  				'50%': {
  					opacity: '1'
  				},
  				'100%': {
  					transform: 'translateX(300%)',
  					opacity: '0'
  				}
  			},
  			'typing-dots': {
  				'0%, 60%, 100%': {
  					transform: 'translateY(0)',
  					opacity: '0.4'
  				},
  				'30%': {
  					transform: 'translateY(-8px)',
  					opacity: '1'
  				}
  			},
  			'scan-line': {
  				'0%': {
  					transform: 'translateX(-100%)'
  				},
  				'100%': {
  					transform: 'translateX(100%)'
  				}
  			},
  			'pulse-glow': {
  				'0%, 100%': {
  					opacity: '0.4',
  					transform: 'scale(1)'
  				},
  				'50%': {
  					opacity: '1',
  					transform: 'scale(1.05)'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'shimmer': 'shimmer 2.5s infinite',
  			'typing-dots': 'typing-dots 1.4s infinite ease-in-out',
  			'scan-line': 'scan-line 2s infinite ease-in-out',
  			'pulse-glow': 'pulse-glow 2s infinite ease-in-out'
  		},
  		fontFamily: {
  			mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', 'monospace'],
  		},
  		backgroundColor: {
  			'gray-750': '#374151',
  			'gray-850': '#1F2937',
  		},
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
