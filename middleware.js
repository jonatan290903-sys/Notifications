// Middleware simplificado — la auth check se hace en el layout client-side
import { NextResponse } from 'next/server';
export function middleware(request) { return NextResponse.next(); }
export const config = { matcher: [] };
