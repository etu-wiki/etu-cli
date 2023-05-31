import { useRouter } from 'next/router';

// has ignored typecheck to mitigate the following type error:
import dynamic from "next/dynamic";
const CloverIIIF = dynamic(() => import("@samvera/clover-iiif"), {
    ssr: false,
});

export default function Clover() {
    const router = useRouter();
    const { query } = router;
    console.log(query)
    const id = `http://localhost:3000/p/${query.id}/manifest.json`;

    // @ts-nocheck
    // @ts-ignore
    /* tslint:disable */
    /* eslint-disable */
    return <CloverIIIF id={id} />;
}

// import etu from '../../public/etu.json';

// // This function gets called at build time
// export async function getStaticPaths() {
//     // Get the paths we want to pre-render based on posts
//     const res = await fetch('http://localhost:3000/etu.json');
//     const etu = await res.json()
//     const paths = etu.images.map((present) => ({
//       params: { id: present.presentUuid },
//     }));
   
//     // We'll pre-render only these paths at build time.
//     // { fallback: false } means other routes should 404.
//     return { paths, fallback: false };
//   }

// // This also gets called at build time
// export async function getStaticProps({ params }) {
//     // params contains the post `id`.
//     // If the route is like /posts/1, then params.id is 1

//     const res = await fetch('http://localhost:3000/etu.json');
//     const etu = await res.json()
//     const present = etu.images.filter((present) => present.presentUuid === params.id)
//     // Pass post data to the page via props
//     return { props: { id: present.presentUuid } };
//   }

// export async function getServerSideProps() {
// // Fetch data from external API
// const res = await fetch(`https://.../data`);
// const data = await res.json();

// // Pass data to the page via props
// return { props: { data } };
// }

// // has ignored typecheck to mitigate the following type error:
// import dynamic from "next/dynamic";
// const CloverIIIF = dynamic(() => import("@samvera/clover-iiif"), {
//     ssr: false,
// });

// export default function Clover({id}) {
//     // @ts-nocheck
//     // @ts-ignore
//     /* tslint:disable */
//     /* eslint-disable */
//     return <CloverIIIF id={`http://localhost:3000/p/${id.id}/manifest.json`} />;
// }