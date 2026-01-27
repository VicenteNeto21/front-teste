
using BackendApi.Enums;
namespace BackendApi.Models
{
    public class Apiario
    {
        public int Id { get; set; }
        
        public required User User { get; set; }
        public Localizacao? Localizacao { get; set; }
        public string? Coord_X {get; set;}
        public string? Coord_Y {get; set;}
        public required string Bioma {get; set;}
        public required string TipoDeAbelha {get; set;}
        public required string TipoDeMel {get; set;}
        public StatusAtividadeEnum Atividade {get; set;}
        public DateTime CreationDate { get; set; } = DateTime.Now;
        public DateTime? DeletionDate { get; set; } = null;

    }
}