import type {Metadata} from "next"; import "./globals.css";
export const metadata:Metadata={title:"PayGuard — Financial Security Intelligence",description:"Real-time transaction risk monitoring and fraud analytics."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
