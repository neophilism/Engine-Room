import React from 'react';
import {render,screen} from '@testing-library/react';
import {describe,it,expect} from 'vitest';
import {SecurityStandardStatus} from './security-standard-status';
const status={repository:'neophilism/Engine-Room',state:'valid' as const,implemented:true,tested:true,independentReview:false,certificationEligible:false as const,reasons:['Independent expert review pending'],sourceUrl:'https://github.com/neophilism/Engine-Room/blob/main/security/e2eesa-status.json',observedAt:null};
describe('three security stage checkboxes',()=>{
 it('leaves the expert checkbox unchecked and manages all stages from repository evidence',()=>{
 render(<SecurityStandardStatus statuses={[status]}/>);
 const boxes=screen.getAllByRole('checkbox');expect(boxes).toHaveLength(3);
 expect(boxes[0]).toBeChecked();expect(boxes[1]).toBeChecked();expect(boxes[2]).not.toBeChecked();
 expect(boxes.every(b=>b.hasAttribute('disabled'))).toBe(true);
 });
 it('omits explicitly excluded older repository status',()=>{
 render(<SecurityStandardStatus statuses={[{...status,state:'excluded'}]}/>);
 expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
 });
});
