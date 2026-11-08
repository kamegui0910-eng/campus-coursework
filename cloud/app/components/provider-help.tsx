"use client";
import {useState} from 'react';
import {ExternalLink,Copy,Check} from 'lucide-react';
export default function ProviderHelp({href,label}:{href:string;label:string}){
 const [copied,setCopied]=useState(false),[show,setShow]=useState(false);
 async function copy(){try{await navigator.clipboard.writeText(href);setCopied(true);}catch{setShow(true);}}
 return <div className="provider-help"><a href={href} target="_top" rel="noreferrer">{label}<ExternalLink size={14}/></a><button type="button" onClick={copy} aria-label={`复制${label}网址`}>{copied?<Check size={14}/>:<Copy size={14}/>}<span>{copied?'已复制':'复制网址'}</span></button>{show&&<input aria-label="长按复制网址" value={href} readOnly onFocus={e=>e.target.select()}/>}</div>;
}
