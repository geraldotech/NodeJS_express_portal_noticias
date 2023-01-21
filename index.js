require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const fileupload = require("express-fileupload");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs"); //file system manipular arquivos de upload
const app = express();

const Posts = require("./Posts.js");
const { validate } = require("./Posts.js");
var session = require("express-session");
const { fstat } = require("fs");

mongoose
  .connect(process.env.CHAVE, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(function () {
    console.log("conectado com sucesso!");
  })
  .catch(function (err) {
    console.log(error.message);
  });

//body-parser
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

//file upload
app.use(
  fileupload({
    useTempFiles: true,
    tempFileDir: path.join(__dirname, "temp"),
  })
);

//express session
app.use(session({ secret: "keyboard cat", cookie: { maxAge: 60000 } }));

//receita bolo
app.engine("html", require("ejs").renderFile);
app.set("view engine", "html");
app.use("/public", express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "/pages"));

//home
app.get("/", (req, res) => {
  // console.log(req.query)

  if (req.query.busca == null) {
    Posts.find({})
      .sort({ _id: -1 })
      .exec(function (err, posts) {
        posts = posts.map(function (val) {
          return {
            title: val.title,
            conteudo: val.conteudo,
            descricao: val.conteudo.substr(0, 100),
            imagem: val.imagem,
            slug: val.slug,
            categoria: val.categoria,
          };
        });

        Posts.find({})
          .sort({ views: -1 })
          .limit(3)
          .exec(function (err, postsTop) {
            // console.log(posts[0]);
            postsTop = postsTop.map(function (val) {
              return {
                title: val.title,
                conteudo: val.conteudo,
                descricao: val.conteudo.substr(0, 100),
                imagem: val.imagem,
                slug: val.slug,
                categoria: val.categoria,
                views: val.views,
              };
            });

            res.render("home", { posts: posts, postsTop: postsTop });
          });
        ///res.render('home',{posts:posts});
      });
  } else {
    //search
    Posts.find(
      { title: { $regex: req.query.busca, $options: "i" } },
      function (err, posts) {
        console.log(posts);
        posts = posts.map(function (val) {
          return {
            title: val.title,
            conteudo: val.conteudo,
            descricao: val.conteudo.substr(0, 100),
            imagem: val.imagem,
            slug: val.slug,
            categoria: val.categoria,
            views: val.views,
          };
        });
        res.render("busca", { posts: posts, contagem: posts.length });
      }
    );
  }
});

//slug das pages
app.get("/:slug", (req, res) => {
  Posts.findOneAndUpdate(
    { slug: req.params.slug },
    { $inc: { views: 1 } },
    { new: true },
    function (err, resposta) {
      //console.log(resposta);
      if (resposta != null) {
        Posts.find({})
          .sort({ views: -1 })
          .limit(3)
          .exec(function (err, postsTop) {
            postsTop = postsTop.map(function (val) {
              return {
                titulo: val.titulo,
                conteudo: val.conteudo,
                descricao: val.conteudo.substr(0, 100),
                imagem: val.imagem,
                slug: val.slug,
                categoria: val.categoria,
                views: val.views,
              }; //return
            }); //posts_map
            res.render("single", { noticia: resposta, postsTop: postsTop });
          }); //func Post.find
      } else {
        res.redirect("/");
      } //if resposta
    }
  ); //fun _err_resposta
}); //appg.get

//session rota

var usuarios = [
  {
    login: "geraldo",
    senha: "123",
  },
];

//so consegue usar o post devido ao body parser
app.post("/admin/login", (req, res) => {
  //console.log(req.body.login)
  usuarios.map(function (val) {
    //console.log(val.login)
    if (val.login == req.body.login && val.senha == req.body.senha) {
      req.session.login = "Geraldo";
    }
  });
  res.redirect("/admin/login");
});

//rota para cadastro
app.post("/admin/cadastro", (req, res) => {
  //res.send('cadastrado com sucesso!') //https://www.mongodb.com/docs/manual/reference/method/db.collection.insertOne/
  //console.log(req.body);
  console.log(req.files);

  //upload de arquivos dentro da variavel req.files
  let formato = req.files.arquivo.name.split(".");
  var imagem = "";

  if (formato[formato.length - 1] == "jpg") {
    imagem = new Date().getTime() + ".jpg";
    req.files.arquivo.mv(__dirname + "/public/images/" + imagem);
  } else {
    //deleta arquivo da memoria
    fs.unlinkSync(req.files.arquivo.tempFilePath);
  }

  Posts.create({
    title: req.body.titulo_noticia,
    imagem: "http://localhost:5000/public/images/" + imagem,
    categoria: "None",
    conteudo: req.body.noticia,
    slug: req.body.slug,
    autor: "Admin",
    views: 0,
  });
  //res.send("Cadastrado com sucesso!");
  res.redirect("/admin/login");
});

//rota deletar
app.get("/admin/deletar/:id", (req, res) => {
  Posts.deleteOne({ _id: req.params.id }).then(function () {
    //mostran mensagem in new page
    //res.send("Deletado a noticia com id:" + req.params.id);
    res.redirect("/admin/login");
  });
});

app.get("/admin/login", (req, res) => {
  if (req.session.login == null) {
    /*   req.session.login = "Geraldo";
        res.send("Sua sessão foi criada"); */
    res.render("admin-login");
  } else {
    //res.send(req.session.login);
    Posts.find({})
      .sort({ _id: -1 })
      .exec(function (err, posts) {
        // console.log(posts[0]);
        posts = posts.map(function (val) {
          return {
            id: val._id,
            title: val.title,
            conteudo: val.conteudo,
            descricao: val.conteudo.substr(0, 100),
            imagem: val.imagem,
            slug: val.slug,
            categoria: val.categoria,
          };
        });

        res.render("admin-panel", { posts: posts });
        console.log(posts);
      });
  }
});

//isabella
app.get("/a/isa", (req, res) => {
  res.send("ok");
});

//server
app.listen(5000, () => {
  console.log("server is on");
});
