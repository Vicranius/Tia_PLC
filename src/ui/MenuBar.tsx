'use client';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from '@/components/ui/dropdown-menu';
import {useT} from '../i18n/react';
import {processDict} from '../i18n/dict/process';
export interface MenuAction {label:string;run:()=>void;disabled?:boolean}
export default function MenuBar({menus}:{menus:{name:string;items:MenuAction[]}[]}){const t=useT(processDict);return <nav className="classic-menubar" aria-label={t('menu.aria')}>{menus.map(m=><DropdownMenu key={m.name}><DropdownMenuTrigger>{m.name}</DropdownMenuTrigger><DropdownMenuContent className="classic-menu">{m.items.map(item=><DropdownMenuItem key={item.label} disabled={item.disabled} onClick={item.run}>{item.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>)}</nav>;}
