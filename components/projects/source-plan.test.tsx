import React from 'react';
import {render,screen} from '@testing-library/react';
import {it,expect} from 'vitest';
import {SourcePlan} from './source-plan';
it('shows implemented software and pending release inputs even when no full-scope PR is mapped',()=>{
 render(<SourcePlan plan={{original:1,originalComplete:0,added:0,addedComplete:0,unmapped:1,documents:[],items:[{ordinal:1,title:'Working page',scope:'original',numbers:[],state:'unmapped',reason:null,sourceUrl:'https://github.com/neophilism/Galinsky-2028',implementationReview:{implementation:'implemented',reviewedAt:'2026-10-19T00:00:00Z',softwareGap:null,activationRequirement:'Supply final video.',sourceFiles:[{path:'page.mjs',sha256:'a'.repeat(64)}]}}]}}/>);
 expect(screen.getByText('Software implemented')).toBeInTheDocument();expect(screen.getByText(/Release or activation: Supply final video/)).toBeInTheDocument();expect(screen.queryByText(/not started|partially implemented|unfinished units/i)).not.toBeInTheDocument();
});
