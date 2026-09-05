'use client';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from '@/components/ui/dropdown-menu';
export interface MenuAction {label:string;run:()=>void;disabled?:boolean}
export default function MenuBar({menus}:{menus:{name:string;items:MenuAction[]}[]}){return <nav className="classic-menubar" aria-label="Application menu">{menus.map(m=><DropdownMenu key={m.name}><DropdownMenuTrigger>{m.name}</DropdownMenuTrigger><DropdownMenuContent className="classic-menu">{m.items.map(item=><DropdownMenuItem key={item.label} disabled={item.disabled} onClick={item.run}>{item.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>)}</nav>;}
