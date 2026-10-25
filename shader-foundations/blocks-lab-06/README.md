# BlocksLab candidate06 - sky shapes

Keep BlocksLab-materials-04 enabled; select this shader ZIP alone.
Candidate05 screenshot showed streaky clouds, tiny sun and pale sunset horizon.
Candidate06 uses bounded angular dome coordinates for clustered 2D clouds,
a larger stylized sun disc, darker horizon radiance and 35% lower base distance
fog with less sunset amplification. Far render-distance fade and underwater fog
are unchanged. Blocks, material assets, lighting and water algorithms are retained;
water reflects the revised sky and participates in the reduced atmosphere.

Clouds are a stylized 2D dome with limited parallax, not volumetric clouds or
physical scattering. No stars; new appearance needs Minecraft feedback.
Keep shader clouds enabled; vanilla clouds stay disabled to prevent overlap.
Test fixed-camera noon, sunset, night and rain; pan around the sun/horizon and
look up at cloud shapes. Check cloud motion, terrain silhouettes and reflected sky.
Native compile/tests and synthetic preview do not establish Iris visual acceptance.
No paid generation request or deployment.
